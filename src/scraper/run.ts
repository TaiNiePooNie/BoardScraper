/**
 * CLI: npm run scrape -- --retailer=example [--limit=20]
 * Crawls listing pages → product pages, stores a price snapshot per listing.
 */
import { BlockedError, gotoSafe, launchBrowser, newStealthContext } from "./browser";
import { ADAPTERS } from "./retailers";
import type { ScrapedProduct } from "./retailers/base";
import { saveSnapshot } from "./store";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const ids = args.retailer ? [args.retailer] : Object.keys(ADAPTERS);
const limit = Number(args.limit ?? Infinity);

async function main() {
  const browser = await launchBrowser();
  try {
    for (const id of ids) {
      const adapter = ADAPTERS[id];
      if (!adapter) throw new Error(`Unknown retailer "${id}". Known: ${Object.keys(ADAPTERS).join(", ")}`);
      const ctx = await newStealthContext(browser, { locale: `en-${adapter.retailer.country}` });
      const page = await ctx.newPage();
      const productUrls = new Set<string>();

      try {
        for (let url of adapter.listingUrls) {
          for (let guard = 0; url && guard < 50 && productUrls.size < limit; guard++) {
            await gotoSafe(page, url);
            const { productUrls: found, nextPage } = await adapter.parseListing(page);
            found.forEach((u) => productUrls.add(u));
            url = nextPage ?? "";
          }
        }

        const products: ScrapedProduct[] = [];
        for (const url of [...productUrls].slice(0, limit)) {
          try {
            await gotoSafe(page, url);
            const p = await adapter.parseProduct(page);
            if (p) products.push(p);
          } catch (e) {
            if (e instanceof BlockedError) throw e;
            console.warn(`  ✗ ${url}: ${(e as Error).message}`);
          }
        }
        await saveSnapshot(id, products);
        console.log(`✓ ${id}: ${products.length}/${productUrls.size} products`);
      } catch (e) {
        if (e instanceof BlockedError) console.error(`⚠ ${id}: ${e.message} — backing off this retailer`);
        else throw e;
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
