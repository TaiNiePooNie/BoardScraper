/**
 * Deeper survey for adding retailers (runs in GitHub Actions, which can reach every shop):
 * for each candidate, Shopify store facts (/meta.json: currency, country, ships_to_countries),
 * the public shipping policy text, product_type counts and how many boards our
 * classifier keeps per sport from the first catalogue pages. Writes JSON (one object per site).
 *
 *   npx tsx scripts/survey-deep.ts [out.json] [id,id]
 *
 * Same politeness as the scraper: robots.txt obeyed, ≥ 2.5 s between requests per host,
 * stops on 403/429/challenges.
 */
import { writeFileSync } from "node:fs";
import { PoliteFetcher } from "../src/scraper/http";
import { shopifyBoard, type ShopifyProduct } from "../src/scraper/retailers/shopify";
import { CurrencyCode, type Sport } from "../src/lib/types";
import { CANDIDATES } from "./survey-retailers";

const PAGES = 6;

interface Result {
  id: string;
  kind: string;
  url: string;
  shopify: boolean;
  error?: string;
  meta?: { name?: string; currency?: string; country?: string; shipsTo?: string[] };
  shippingPolicy?: string;
  productTypes?: Record<string, number>;
  scanned?: number;
  boards?: Partial<Record<Sport, number>>;
  sample?: string[];
}

const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function deep(c: (typeof CANDIDATES)[number]): Promise<Result> {
  const http = new PoliteFetcher({ retries: 0, timeoutMs: 25_000 });
  const r: Result = { id: c.id, kind: c.kind, url: c.url, shopify: false };
  try {
    const meta = await http.getJson<{ name?: string; currency?: string; country?: string; ships_to_countries?: string[] }>(`${c.url}/meta.json`);
    r.shopify = true;
    r.meta = { name: meta.name, currency: meta.currency, country: meta.country, shipsTo: meta.ships_to_countries };
  } catch (e) {
    r.error = `meta: ${(e as Error).message.slice(0, 120)}`;
    return r;
  }
  try {
    const pol = await http.get(`${c.url}/policies/shipping-policy`);
    const m = /<div class="rte">([\s\S]*?)<\/div>\s*<\/div>/i.exec(pol.text);
    r.shippingPolicy = text(m?.[1] ?? pol.text).slice(0, 2500);
  } catch (e) {
    r.shippingPolicy = `(unavailable: ${(e as Error).message.slice(0, 80)})`;
  }
  const currency = CurrencyCode.safeParse(r.meta?.currency).success ? (r.meta!.currency as CurrencyCode) : "USD";
  const types: Record<string, number> = {};
  const boards: Partial<Record<Sport, number>> = {};
  const sample: string[] = [];
  let scanned = 0;
  try {
    for (let page = 1; page <= PAGES; page++) {
      const { products } = await http.getJson<{ products: ShopifyProduct[] }>(`${c.url}/products.json?limit=250&page=${page}`);
      if (!products?.length) break;
      for (const p of products) {
        scanned++;
        types[p.product_type || "(none)"] = (types[p.product_type || "(none)"] ?? 0) + 1;
        const b = shopifyBoard(p, c.url, new Date().toISOString(), currency);
        if (b) {
          boards[b.sport] = (boards[b.sport] ?? 0) + 1;
          if (sample.length < 6) sample.push(`${b.sport}/${b.category ?? "?"}: ${b.title} · ${b.price} ${b.currency} · ${b.sizes.map((s) => s.label).join(" ")}`);
        }
      }
    }
  } catch (e) {
    r.error = `products: ${(e as Error).message.slice(0, 120)}`;
  }
  r.scanned = scanned;
  r.boards = boards;
  r.sample = sample;
  r.productTypes = Object.fromEntries(Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 25));
  return r;
}

async function main() {
  const out = process.argv[2] ?? "survey-deep.json";
  const only = process.argv[3]?.split(",").map((s) => s.trim());
  const list = only ? CANDIDATES.filter((c) => only.includes(c.id)) : CANDIDATES;
  const results = await Promise.all(list.map(deep));
  writeFileSync(out, JSON.stringify(results, null, 1));
  for (const r of results) {
    console.log(`${r.id.padEnd(20)} ${r.shopify ? "shopify" : "-      "} ${(r.meta?.currency ?? "").padEnd(4)} ships:${(r.meta?.shipsTo?.length ?? 0).toString().padStart(3)} scanned:${String(r.scanned ?? 0).padStart(5)} boards:${JSON.stringify(r.boards ?? {})} ${r.error ?? ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
