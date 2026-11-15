/**
 * Save sample pages from candidate shops so parsers can be written offline
 * (runs in GitHub Actions; the dev sandbox can't reach most shops).
 * Per site: robots.txt, sitemap URL list, up to 5 likely board product pages and,
 * when it answers, a small /products.json sample. Only robots-allowed URLs are fetched,
 * with the scraper's PoliteFetcher (≥ 2.5 s/host, stops on 403/429/challenges).
 *
 *   npx tsx scripts/capture-fixtures.ts outDir id,id,…
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PoliteFetcher, sitemapLocs } from "../src/scraper/http";
import { CANDIDATES } from "./survey-retailers";

const BOARD = /snowboard|splitboard|skateboard|skate-?deck|\bdecks?\b|complete|cruiser|longboard|surfboard|surf-?board|softboard|foamie|\bboards?\b|planche|tabla|deck|tavola/i;
const GEAR = /binding|boot|wheel|truck|bearing|griptape|grip-tape|wetsuit|leash|\bfins?\b|bag|helmet|jacket|pant|shoe|sock|hood|tee|shirt|cap|beanie|glove|goggle|wax|sticker|gift|hardware|tool|wax/i;
const MAX_HTML = 700_000;

async function capture(id: string, out: string) {
  const c = CANDIDATES.find((x) => x.id === id);
  if (!c) return console.log(`${id}: unknown id`);
  const dir = path.join(out, id);
  mkdirSync(dir, { recursive: true });
  const http = new PoliteFetcher({ retries: 0, timeoutMs: 30_000 });
  const note: string[] = [];
  let origin = c.url;
  try {
    const home = await http.get(`${c.url}/`);
    origin = new URL(home.url).origin;
    writeFileSync(path.join(dir, "home.html"), home.text.slice(0, MAX_HTML));
  } catch (e) {
    note.push(`home: ${(e as Error).message.slice(0, 100)}`);
  }
  let robots = "";
  try {
    const r = await fetch(`${origin}/robots.txt`);
    robots = r.ok ? await r.text() : "";
    writeFileSync(path.join(dir, "robots.txt"), robots);
  } catch { /* none */ }

  // Sitemaps: robots "Sitemap:" lines, else /sitemap.xml; follow index → product-ish children.
  const roots = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (!roots.length) roots.push(`${origin}/sitemap.xml`);
  const urls = new Set<string>();
  const queue = [...roots];
  let fetched = 0;
  while (queue.length && fetched < 8 && urls.size < 20000) {
    const sm = queue.shift()!;
    try {
      const x = await http.get(sm, "application/xml,text/xml;q=0.9,*/*;q=0.5");
      fetched++;
      const locs = sitemapLocs(x.text);
      if (/<sitemapindex/i.test(x.text)) {
        const kids = locs.sort((a, b) => Number(/product|prod|catalog|item/i.test(b)) - Number(/product|prod|catalog|item/i.test(a)));
        queue.push(...kids.slice(0, 6));
      } else locs.forEach((u) => urls.add(u));
    } catch (e) {
      note.push(`sitemap ${sm}: ${(e as Error).message.slice(0, 80)}`);
    }
  }
  const list = [...urls];
  writeFileSync(path.join(dir, "urls.txt"), list.slice(0, 20000).join("\n"));

  // Pick likely board pages, spread over different keywords.
  const picks: string[] = [];
  const seenKey = new Set<string>();
  for (const u of list) {
    if (picks.length >= 5) break;
    const p = decodeURIComponent(new URL(u).pathname).toLowerCase();
    if (!BOARD.test(p) || GEAR.test(p)) continue;
    const key = (BOARD.exec(p)?.[0] ?? "").replace(/s$/, "");
    if (seenKey.has(key) && picks.length >= 3) continue;
    seenKey.add(key);
    picks.push(u);
  }
  for (const [i, u] of picks.entries()) {
    try {
      const r = await http.get(u);
      writeFileSync(path.join(dir, `product-${i + 1}.html`), `<!-- ${u} -->\n` + r.text.slice(0, MAX_HTML));
    } catch (e) {
      note.push(`product ${u}: ${(e as Error).message.slice(0, 80)}`);
    }
  }
  try {
    const pj = await http.get(`${origin}/products.json?limit=5`, "application/json");
    if (pj.text.trim().startsWith("{")) writeFileSync(path.join(dir, "products.json"), pj.text.slice(0, 400_000));
  } catch { /* not shopify */ }
  writeFileSync(path.join(dir, "NOTES.txt"), [`origin ${origin}`, `sitemap urls ${list.length}`, `picked ${picks.length}`, ...picks, ...note].join("\n"));
  console.log(`${id.padEnd(18)} origin=${origin} urls=${list.length} pages=${picks.length} ${note.join(" | ").slice(0, 200)}`);
}

async function main() {
  const out = process.argv[2] ?? "fixtures-raw";
  const ids = (process.argv[3] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  await Promise.all(ids.map((id) => capture(id, out).catch((e) => console.log(`${id}: ${(e as Error).message}`))));
}

main();
