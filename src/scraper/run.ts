/**
 * Scrape → ingest → regrade.
 *
 *   npm run scrape                          # all retailers
 *   npm run scrape -- --retailer=evo --limit=20
 *   npm run scrape -- --retailer=glisshop --dry-run   # parse only, print, no DB
 *   npm run scrape -- --retailer=evo --sport=skate,surf --dry-run --limit=5
 *
 * --limit caps products per sport per retailer. --sport limits the run to those
 * sports (and then never deactivates listings, since the run is partial).
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
import { Sport } from "@/lib/types";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "true"];
}));
const ids = args.retailer ? String(args.retailer).split(",") : Object.keys(ADAPTERS);
const limit = args.limit ? Number(args.limit) : Infinity;
const dryRun = args["dry-run"] === "true";
const sports = args.sport ? String(args.sport).split(",").map((s) => Sport.parse(s.trim())) : undefined;

async function main() {
  for (const id of ids) if (!ADAPTERS[id]) throw new Error(`Unknown retailer "${id}". Known: ${Object.keys(ADAPTERS).join(", ")}`);
  // Retailers that sell none of the requested sports are skipped.
  const runIds = sports ? ids.filter((id) => ADAPTERS[id].sports.some((s) => sports.includes(s))) : ids;

  const handle = dryRun ? null : await openDb();
  if (handle) await handle.migrate();
  let failed = false;

  try {
    for (const id of runIds) {
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
        for await (const p of adapter.crawl({ http, limit, log, sports })) {
          seen++;
          if (!handle) {
            console.log(JSON.stringify({ sport: p.sport, category: p.category, brand: p.brand, model: p.model, season: p.season, price: p.price, listPrice: p.listPrice, currency: p.currency, sizes: p.sizes.map((s) => `${s.label}${s.volumeL ? ` ${s.volumeL}L` : ""}${s.lengthCm && p.sport === "skate" ? ` (${s.lengthCm}cm)` : ""}${s.inStock ? "" : "✗"}`).join(" "), specs: p.specs, rating: p.rating }));
            continue;
          }
          const r = await ingestProduct(handle.db, id, p);
          boardIds.add(r.boardId);
          listingIds.push(r.listingId);
        }
        if (handle) {
          await refreshBoards(handle.db, [...boardIds]);
          const off = Number.isFinite(limit) || sports ? 0 : await deactivateMissing(handle.db, id, listingIds);
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
