/**
 * Scrape → ingest → regrade.
 *
 *   npm run scrape                          # all retailers, one after another
 *   npm run scrape -- --group=fast --parallel          # catalogue-feed shops, side by side
 *   npm run scrape -- --group=slow --parallel --budget-minutes=150
 *   npm run scrape -- --retailer=evo --limit=20
 *   npm run scrape -- --retailer=glisshop --dry-run   # parse only, print, no DB
 *   npm run scrape -- --retailer=evo --sport=skate,surf --dry-run --limit=5
 *
 * --group: fast = shops with a catalogue feed (Shopify), slow = one page per product.
 * --parallel runs all selected shops at once; each shop still keeps its own polite
 * delay, and database writes share one limit. --budget-minutes stops each shop after
 * that long (known boards are re-checked first); such a run is partial.
 * --limit caps products per sport per retailer. Partial runs (limit, sport, budget hit)
 * never deactivate listings.
 *
 * Exit code is non-zero if any retailer errored (not if it was merely blocked),
 * so the scheduled workflow surfaces breakage.
 */
import { and, asc, eq } from "drizzle-orm";
import { openDb } from "@/db/client";
import { listings, scrapeRuns } from "@/db/schema";
import { BlockedError, PoliteFetcher } from "./http";
import { deactivateMissing, ingestProduct, refreshBoards, upsertRetailer } from "./ingest";
import { ADAPTERS } from "./retailers";
import { Sport } from "@/lib/types";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "true"];
}));
const group = args.group ? String(args.group) : "all";
if (!["fast", "slow", "all"].includes(group)) throw new Error(`--group must be fast, slow or all (got "${group}")`);
const ids = (args.retailer ? String(args.retailer).split(",").map((s) => s.trim()) : Object.keys(ADAPTERS))
  .filter((id) => group === "all" || !ADAPTERS[id] || !!ADAPTERS[id].slow === (group === "slow"));
const limit = args.limit ? Number(args.limit) : Infinity;
const dryRun = args["dry-run"] === "true";
const parallel = args.parallel === "true";
const budgetMs = args["budget-minutes"] ? Number(args["budget-minutes"]) * 60_000 : Infinity;
const sports = args.sport ? String(args.sport).split(",").map((s) => Sport.parse(s.trim())) : undefined;

// PGlite is a single in-process connection: one transaction at a time there.
// Shared by all shops, so parallel shops don't swamp the database.
const INGEST_CONCURRENCY = process.env.DATABASE_URL?.startsWith("pglite:") ? 1 : Number(process.env.INGEST_CONCURRENCY ?? 24);
let ingestSlots = INGEST_CONCURRENCY;
const waiting: (() => void)[] = [];
const acquire = () => ingestSlots > 0 ? (ingestSlots--, Promise.resolve()) : new Promise<void>((r) => waiting.push(r));
const release = () => { const next = waiting.shift(); if (next) next(); else ingestSlots++; };

type Db = Parameters<typeof ingestProduct>[0];
type Product = Parameters<typeof ingestProduct>[2];

/** Parallel upserts can rarely collide (deadlock / unique race on a shared board): retry. */
async function ingestWithRetry(db: Db, id: string, p: Product) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await ingestProduct(db, id, p);
    } catch (e) {
      const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
      if (attempt >= 3 || !["40P01", "40001", "23505"].includes(code ?? "")) throw e;
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
}

/** Scrape one shop. Returns false when it errored (blocked is not an error). */
async function scrapeRetailer(id: string, db: Db | null): Promise<boolean> {
  const adapter = ADAPTERS[id];
  const http = new PoliteFetcher();
  const log = (m: string) => console.log(`[${id}] ${m}`);
  const started = Date.now();
  let seen = 0;
  const boardIds = new Set<number>();
  const listingIds: number[] = [];
  let runId: number | null = null;
  /** Slow shops: our active listings there, least recently checked first. */
  let knownUrls: Set<string> | undefined;

  if (db) {
    await upsertRetailer(db, adapter.retailer);
    [{ id: runId }] = await db.insert(scrapeRuns).values({ retailerId: id }).returning({ id: scrapeRuns.id });
    if (adapter.slow) {
      const rows = await db.select({ url: listings.url }).from(listings)
        .where(and(eq(listings.retailerId, id), eq(listings.active, true))).orderBy(asc(listings.lastScrapedAt));
      knownUrls = new Set(rows.map((r) => r.url));
    }
  }
  const finish = async (status: string, error?: string) => {
    if (db && runId !== null) {
      await db.update(scrapeRuns)
        .set({ status, finishedAt: new Date(), productsSeen: seen, productsSaved: listingIds.length, error: error ?? null })
        .where(eq(scrapeRuns.id, runId));
    }
  };

  try {
    // Saving is the slow part (several database round trips per product), so products
    // are written in parallel while the crawl goes on. Requests to the shop are
    // unaffected: the fetcher keeps its per-host delay.
    const inflight = new Set<Promise<void>>();
    let ingestError: unknown = null;
    let outOfTime = false;
    for await (const p of adapter.crawl({ http, limit, log, sports, knownUrls })) {
      seen++;
      if (ingestError) throw ingestError;
      if (!db) {
        console.log(JSON.stringify({ sport: p.sport, category: p.category, brand: p.brand, model: p.model, season: p.season, price: p.price, listPrice: p.listPrice, currency: p.currency, sizes: p.sizes.map((s) => `${s.label}${s.volumeL ? ` ${s.volumeL}L` : ""}${s.lengthCm && p.sport === "skate" ? ` (${s.lengthCm}cm)` : ""}${s.inStock ? "" : "✗"}`).join(" "), specs: p.specs, rating: p.rating }));
      } else {
        await acquire();
        const job = ingestWithRetry(db, id, p)
          .then((r) => { boardIds.add(r.boardId); listingIds.push(r.listingId); })
          .catch((e) => { ingestError ??= e; })
          .finally(() => { release(); inflight.delete(job); });
        inflight.add(job);
      }
      if (Date.now() - started > budgetMs) { outOfTime = true; break; }
    }
    await Promise.all(inflight);
    if (ingestError) throw ingestError;
    if (db) {
      await refreshBoards(db, [...boardIds]);
      const partial = outOfTime || Number.isFinite(limit) || !!sports;
      const off = partial ? 0 : await deactivateMissing(db, id, listingIds);
      log(partial ? `partial run${outOfTime ? " (time budget reached)" : ""}: listings kept` : `deactivated ${off} stale listings`);
    }
    await finish("ok");
    log(`✓ ${seen} products, ${http.requests} requests, ${Math.round((Date.now() - started) / 1000)}s`);
    return true;
  } catch (e) {
    const msg = (e as Error).message;
    let ok = true;
    if (e instanceof BlockedError) {
      log(`⚠ ${msg} — backing off this retailer`);
      await finish("blocked", msg);
    } else {
      ok = false;
      console.error(`[${id}] ✗`, e);
      await finish("error", msg);
    }
    if (db && boardIds.size) await refreshBoards(db, [...boardIds]);
    return ok;
  }
}

async function main() {
  for (const id of ids) if (!ADAPTERS[id]) throw new Error(`Unknown retailer "${id}". Known: ${Object.keys(ADAPTERS).join(", ")}`);
  // Retailers that sell none of the requested sports are skipped.
  const runIds = sports ? ids.filter((id) => ADAPTERS[id].sports.some((s) => sports.includes(s))) : ids;
  console.log(`Scraping ${runIds.length} shop(s), group ${group}${parallel ? ", in parallel" : ""}${Number.isFinite(budgetMs) ? `, ${budgetMs / 60_000} min per shop` : ""}`);

  const handle = dryRun ? null : await openDb();
  if (handle) await handle.migrate();
  const db = handle?.db ?? null;
  let failed = false;
  try {
    if (parallel) {
      const results = await Promise.all(runIds.map((id) => scrapeRetailer(id, db)));
      failed = results.includes(false);
    } else {
      for (const id of runIds) if (!(await scrapeRetailer(id, db))) failed = true;
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
