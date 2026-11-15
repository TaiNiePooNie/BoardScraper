import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { formatMoney } from "@/lib/pricing/currency";
import type { CurrencyCode } from "@/lib/types";

/**
 * Live price check for one listing: re-fetches that single product page from
 * the shop (robots-checked, one request), saves the result and regrades the board.
 * Recently checked listings are not fetched again (shop politeness + speed).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const FRESH_MS = 15 * 60_000;
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  return m < 1 ? "just now" : `${m} min ago`;
};

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Live checks need the database." }, { status: 503 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Unknown board." }, { status: 404 });

  const [{ getDb }, s, { ADAPTERS }, { PoliteFetcher, BlockedError }, { ingestProduct, refreshBoards }] = await Promise.all([
    import("@/db/client"), import("@/db/schema"), import("@/scraper/retailers"), import("@/scraper/http"), import("@/scraper/ingest"),
  ]);
  const db = await getDb();
  const [row] = await db.select().from(s.listings).where(eq(s.listings.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Unknown board." }, { status: 404 });

  const money = (n: number) => formatMoney(n, row.priceCurrency as CurrencyCode);
  if (Date.now() - row.lastScrapedAt.getTime() < FRESH_MS) {
    return NextResponse.json({ ok: true, changed: false, price: row.priceAmount, checkedAgo: ago(row.lastScrapedAt), message: `Price checked ${ago(row.lastScrapedAt)}: ${money(row.priceAmount)} at the shop.` });
  }
  const adapter = ADAPTERS[row.retailerId];
  if (!adapter) return NextResponse.json({ error: "This shop isn't supported anymore." }, { status: 410 });

  try {
    const http = new PoliteFetcher({ minDelayMs: 0, retries: 1, timeoutMs: 12_000 });
    const p = await adapter.fetchOne(http, row.url);
    if (!p) {
      return NextResponse.json({ ok: false, changed: false, message: "The shop page changed or the board sold out; showing the last known price." });
    }
    const { boardId } = await ingestProduct(db, row.retailerId, { ...p, url: row.url });
    await refreshBoards(db, [boardId]);
    const changed = Math.abs(p.price - row.priceAmount) >= 0.01;
    const inStock = p.sizes.some((z) => z.inStock);
    return NextResponse.json({
      ok: true,
      changed,
      price: p.price,
      currency: p.currency,
      inStock,
      checkedAgo: "just now",
      message: changed
        ? `Price just changed at the shop: ${money(row.priceAmount)} → ${money(p.price)}.`
        : `Price checked just now: still ${money(p.price)}${inStock ? "" : " (sold out in all sizes)"}.`,
    });
  } catch (e) {
    const blocked = e instanceof BlockedError;
    return NextResponse.json({ ok: false, changed: false, message: blocked ? "The shop isn't answering automated checks right now." : "Couldn't reach the shop; showing the last known price." });
  }
}
