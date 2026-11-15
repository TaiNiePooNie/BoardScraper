import { and, eq, min, sql } from "drizzle-orm";
import { repository } from "./repository";

/** Just enough about one board for link previews and search engines. */
export interface BoardSummary { id: string; brand: string; model: string; season: string; sport: string; image: string | null; fromPrice: number | null; currency: string | null; shops: number }

export async function boardSummary(id: string): Promise<BoardSummary | null> {
  if (repository.source === "mock") {
    const cat = await repository.getCatalog();
    const b = cat.boards.find((x) => x.id === id);
    if (!b) return null;
    const ls = cat.listings.filter((l) => l.boardId === id);
    const best = ls.sort((a, c) => a.price.amount - c.price.amount)[0];
    return { id, brand: b.brand, model: b.model, season: b.season, sport: b.sport, image: b.images[0] ?? null, fromPrice: best?.price.amount ?? null, currency: best?.price.currency ?? null, shops: new Set(ls.map((l) => l.retailerId)).size };
  }
  const n = Number(id);
  if (!Number.isInteger(n)) return null;
  const [{ getDb }, s] = await Promise.all([import("@/db/client"), import("@/db/schema")]);
  const db = await getDb();
  const [b] = await db.select().from(s.boards).where(eq(s.boards.id, n)).limit(1);
  if (!b) return null;
  const offers = await db
    .select({ currency: s.listings.priceCurrency, price: min(s.listings.priceAmount), shops: sql<number>`count(distinct ${s.listings.retailerId})`, image: sql<string | null>`min(${s.listings.images}[1])` })
    .from(s.listings).where(and(eq(s.listings.boardId, n), eq(s.listings.active, true))).groupBy(s.listings.priceCurrency);
  const best = offers.sort((a, c) => Number(c.shops) - Number(a.shops))[0];
  return { id, brand: b.brand, model: b.model, season: b.season, sport: b.sport, image: b.images[0] ?? best?.image ?? null, fromPrice: best?.price ?? null, currency: best?.currency ?? null, shops: offers.reduce((t, o) => t + Number(o.shops), 0) };
}

/** Ids of boards with at least one active listing (sitemap). */
export async function activeBoardIds(limit = 45_000): Promise<string[]> {
  if (repository.source === "mock") return (await repository.getCatalog()).boards.map((b) => b.id);
  const [{ getDb }, s] = await Promise.all([import("@/db/client"), import("@/db/schema")]);
  const rows = await (await getDb()).selectDistinct({ id: s.listings.boardId }).from(s.listings).where(eq(s.listings.active, true)).limit(limit);
  return rows.map((r) => String(r.id));
}
