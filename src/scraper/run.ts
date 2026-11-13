/**
 * Scrape → ingest → regrade.
 *
 *   npm run scrape                          # all retailers
 *   npm run scrape -- --retailer=evo --limit=20
 *   npm run scrape -- --retailer=glisshop --dry-run   # parse only, print, no DB
 *
 * Exit code is non-zero if any retailer errored (not if it was merely blocked),
 * so the scheduled workflow surfaces breakage.
 */
import { eq } from "drizzle-orm";
import { openDb } from "@/db/client";
import { scrapeRuns } from "@/db/schema";
import { BlockedError, PoliteFetcher } from "./http";
import { deactivateMissing, ingestProduct, refreshBoards, upsertRetailer } from "./ingest";
import { ADAPTERS } from "./retailers";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "true"];
}));
const ids = args.retailer ? String(args.retailer).split(",") : Object.keys(ADAPTERS);
const limit = args.limit ? Number(args.limit) : Infinity;
const dryRun = args["dry-run"] === "true";

async function main() {
  for (const id of ids) if (!ADAPTERS[id]) throw new Error(`Unknown retailer "${id}". Known: ${Object.keys(ADAPTERS).join(", ")}`);

  const handle = dryRun ? null : await openDb();
  if (handle) await handle.migrate();
  let failed = false;

  try {
    for (const id of ids) {
      const adapter = ADAPTERS[id];
      const http = new PoliteFetcher();
      const log = (m: string) => console.log(`[${id}] ${m}`);
      const started = Date.now();
      let seen = 0;
      const boardIds = new Set<number>();
      const listingIds: number[] = [];
      let runId: number | null = null;

      if (handle) {
        await upsertRetailer(handle.db, adapter.retailer);
        [{ id: runId }] = await handle.db.insert(scrapeRuns).values({ retailerId: id }).returning({ id: scrapeRuns.id });
      }
      const finish = async (status: string, error?: string) => {
        if (handle && runId !== null) {
          await handle.db.update(scrapeRuns)
            .set({ status, finishedAt: new Date(), productsSeen: seen, productsSaved: listingIds.length, error: error ?? null })
            .where(eq(scrapeRuns.id, runId));
        }
      };

      try {
        for await (const p of adapter.crawl({ http, limit, log })) {
          seen++;
          if (!handle) {
            console.log(JSON.stringify({ brand: p.brand, model: p.model, season: p.season, price: p.price, listPrice: p.listPrice, currency: p.currency, sizes: p.sizes.map((s) => `${s.label}${s.inStock ? "" : "✗"}`).join(" "), specs: p.specs, rating: p.rating }));
            continue;
          }
          const r = await ingestProduct(handle.db, id, p);
          boardIds.add(r.boardId);
          listingIds.push(r.listingId);
        }
        if (handle) {
          await refreshBoards(handle.db, [...boardIds]);
          const off = Number.isFinite(limit) ? 0 : await deactivateMissing(handle.db, id, listingIds);
          log(`deactivated ${off} stale listings`);
        }
        await finish("ok");
        log(`✓ ${seen} products, ${http.requests} requests, ${Math.round((Date.now() - started) / 1000)}s`);
      } catch (e) {
        const msg = (e as Error).message;
        if (e instanceof BlockedError) {
          log(`⚠ ${msg} — backing off this retailer`);
          await finish("blocked", msg);
        } else {
          failed = true;
          console.error(`[${id}] ✗`, e);
          await finish("error", msg);
        }
        if (handle && boardIds.size) await refreshBoards(handle.db, [...boardIds]);
      }
    }
  } finally {
    await handle?.close();
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
