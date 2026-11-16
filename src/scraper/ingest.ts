import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { boards, listingSizes, listings, pricePoints, retailers, reviewSources } from "@/db/schema";
import { computeStats, gradeDeal } from "@/lib/grading";
import { convert } from "@/lib/pricing/currency";
import type { CurrencyCode, Retailer } from "@/lib/types";
import { cleanBrand, sportBoardKey } from "./parse/normalize";
import type { ScrapedProduct } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

export async function upsertRetailer(db: DB, r: Retailer) {
  const row = { id: r.id, name: r.name, homepage: r.homepage, country: r.country, currency: r.currency, pricesIncludeVat: r.pricesIncludeVat, shipping: r.shipping };
  await db.insert(retailers).values(row).onConflictDoUpdate({ target: retailers.id, set: row });
}

/** Upsert one scraped product: board (canonical), listing, sizes, today's price point, review source. */
export async function ingestProduct(db: DB, retailerId: string, p: ScrapedProduct): Promise<{ boardId: number; listingId: number }> {
  return db.transaction(async (tx) => {
    let key = sportBoardKey(p.sport, p.category, p.brand, p.model, p.season);
    if (!p.seasonKnown) {
      // No model year in the title: attach to the newest season we already know for this brand+model.
      const prefix = key.slice(0, key.lastIndexOf("|") + 1);
      const [hit] = await tx.select({ key: boards.key }).from(boards)
        .where(sql`${boards.key} like ${prefix.replace(/[%_]/g, "\\$&") + "%"}`).orderBy(desc(boards.season)).limit(1);
      if (hit) key = hit.key;
    }
    const [board] = await tx
      .insert(boards)
      .values({
        key,
        sport: p.sport,
        category: p.category,
        brand: cleanBrand(p.brand),
        model: p.model,
        season: key.slice(key.lastIndexOf("|") + 1),
        profile: p.specs.profile,
        shape: p.specs.shape,
        flex: p.specs.flex,
        styles: p.specs.styles,
        images: p.images,
      })
      .onConflictDoUpdate({
        target: boards.key,
        // Fill gaps only: the first retailer with a spec wins, later ones can't flip it.
        set: {
          category: sql`coalesce(${boards.category}, excluded.category)`,
          profile: sql`coalesce(${boards.profile}, excluded.profile)`,
          shape: sql`coalesce(${boards.shape}, excluded.shape)`,
          flex: sql`coalesce(${boards.flex}, excluded.flex)`,
          styles: sql`case when cardinality(${boards.styles}) = 0 then excluded.styles else ${boards.styles} end`,
          images: sql`case when cardinality(${boards.images}) = 0 then excluded.images else ${boards.images} end`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: boards.id });

    const values = {
      boardId: board.id,
      retailerId,
      url: p.url,
      title: p.title,
      priceAmount: p.price,
      priceCurrency: p.currency,
      listPrice: p.listPrice,
      images: p.images,
      active: true,
      lastScrapedAt: new Date(p.scrapedAt),
    };
    const [listing] = await tx
      .insert(listings)
      .values(values)
      .onConflictDoUpdate({ target: listings.url, set: values })
      .returning({ id: listings.id });

    await tx.delete(listingSizes).where(eq(listingSizes.listingId, listing.id));
    if (p.sizes.length) {
      await tx.insert(listingSizes).values(
        p.sizes.map((s) => ({
          listingId: listing.id, label: s.label, lengthCm: Math.round(s.lengthCm), waist: s.waist, inStock: s.inStock, price: s.price ?? null,
          widthIn: s.widthIn ?? null, volumeL: s.volumeL ?? null,
        })),
      );
    }

    // Price history is change-only: a point is written when the price or stock differs
    // from the latest one (several checks on one day keep that day's lowest price).
    const inStock = p.sizes.some((s) => s.inStock);
    const [last] = await tx.select().from(pricePoints).where(eq(pricePoints.listingId, listing.id)).orderBy(desc(pricePoints.date)).limit(1);
    if (!last || last.date === today() || Math.abs(last.price - p.price) >= 0.005 || last.inStock !== inStock) {
      await tx
        .insert(pricePoints)
        .values({ listingId: listing.id, date: today(), price: p.price, inStock })
        .onConflictDoUpdate({
          target: [pricePoints.listingId, pricePoints.date],
          set: { price: sql`least(${pricePoints.price}, excluded.price)`, inStock: sql`${pricePoints.inStock} or excluded.in_stock` },
        });
    }

    if (p.rating) {
      const rs = { boardId: board.id, source: retailerId, url: p.url, average: p.rating.average, count: p.rating.count };
      await tx.insert(reviewSources).values(rs).onConflictDoUpdate({ target: [reviewSources.boardId, reviewSources.source], set: rs });
    }
    return { boardId: board.id, listingId: listing.id };
  });
}

/**
 * Recompute derived board fields (MSRP in EUR, review aggregate) and the
 * denormalized grade of every listing of the given boards.
 *
 * MSRP priority: highest retailer RRP/compare-at across listings → highest observed price.
 */
export async function refreshBoards(db: DB, boardIds: number[]) {
  if (!boardIds.length) return;
  const rows = await db.query.listings.findMany({
    where: inArray(listings.boardId, boardIds),
    columns: { id: true, boardId: true, priceAmount: true, priceCurrency: true, listPrice: true },
    with: { history: { columns: { date: true, price: true, inStock: true } } },
  });
  const reviews = await db.select().from(reviewSources).where(inArray(reviewSources.boardId, boardIds));

  const byBoard = new Map<number, typeof rows>();
  for (const r of rows) byBoard.set(r.boardId, [...(byBoard.get(r.boardId) ?? []), r]);

  const reviewsBy = new Map<number, typeof reviews>();
  for (const r of reviews) reviewsBy.set(r.boardId, [...(reviewsBy.get(r.boardId) ?? []), r]);

  // Compute everything first, then write in batches: one UPDATE … FROM (VALUES …) per
  // chunk instead of one round trip per board and per listing (big shops have ~10k).
  const boardRows: { id: number; msrp: number | null; avg: number | null; count: number | null }[] = [];
  const listingRows: { id: number; tier: string; score: number }[] = [];
  for (const boardId of boardIds) {
    const ls = byBoard.get(boardId) ?? [];
    const eur = (n: number, c: string) => convert(n, c as CurrencyCode, "EUR");
    const rrps = ls.filter((l) => l.listPrice).map((l) => eur(l.listPrice!, l.priceCurrency));
    const observed = ls.flatMap((l) => [l.priceAmount, ...l.history.map((h) => h.price)].map((n) => eur(n, l.priceCurrency)));
    const msrpEur = rrps.length ? Math.max(...rrps) : observed.length ? Math.max(...observed) : null;

    const rv = (reviewsBy.get(boardId) ?? []).filter((r) => r.count > 0);
    const count = rv.reduce((n, r) => n + r.count, 0);
    const avg = count ? Math.round((rv.reduce((n, r) => n + r.average * r.count, 0) / count) * 10) / 10 : null;
    boardRows.push({ id: boardId, msrp: msrpEur === null ? null : Math.round(msrpEur * 100) / 100, avg, count: count || null });

    for (const l of ls) {
      const msrp = l.listPrice ?? (msrpEur === null ? l.priceAmount : convert(msrpEur, "EUR", l.priceCurrency as CurrencyCode));
      const g = gradeDeal(l.priceAmount, msrp, computeStats(l.history));
      listingRows.push({ id: l.id, tier: g.tier, score: g.score });
    }
  }

  const CHUNK = 500;
  for (let i = 0; i < boardRows.length; i += CHUNK) {
    const vals = sql.join(boardRows.slice(i, i + CHUNK).map((r) => sql`(${r.id}::int, ${r.msrp}::numeric, ${r.avg}::real, ${r.count}::int)`), sql`, `);
    await db.execute(sql`update ${boards} set msrp_amount = v.m, msrp_currency = 'EUR', review_avg = v.a, review_count = v.c from (values ${vals}) as v(id, m, a, c) where ${boards.id} = v.id`);
  }
  for (let i = 0; i < listingRows.length; i += CHUNK) {
    const vals = sql.join(listingRows.slice(i, i + CHUNK).map((r) => sql`(${r.id}::int, ${r.tier}::deal_tier, ${r.score}::int)`), sql`, `);
    await db.execute(sql`update ${listings} set tier = v.t, score = v.s from (values ${vals}) as v(id, t, s) where ${listings.id} = v.id`);
  }
}

/**
 * Mark listings of this retailer not seen in the current run as inactive —
 * only when the run looks complete (≥ 70 % of previously active listings seen),
 * so a partial/blocked crawl never wipes the catalog.
 */
export async function deactivateMissing(db: DB, retailerId: string, seenIds: number[]): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.retailerId, retailerId), eq(listings.active, true)));
  if (!seenIds.length || seenIds.length < n * 0.7) return 0;
  const res = await db
    .update(listings)
    .set({ active: false })
    .where(and(eq(listings.retailerId, retailerId), eq(listings.active, true), notInArray(listings.id, seenIds)))
    .returning({ id: listings.id });
  return res.length;
}
