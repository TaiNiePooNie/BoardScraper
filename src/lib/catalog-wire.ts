import type { Catalog } from "./data/repository";
import type { BoardModel, BoardSize, Listing, PricePoint, Retailer, Sport, WaistClass } from "./types";

/**
 * Compact catalogue feed (/api/catalog): country-independent and CDN-cacheable.
 * Deals (delivered price, grade, fit) are computed in the browser with buildDeals().
 * Only buyable, fresh listings are sent; sizes and history are packed as tuples.
 */
export const PART_SIZE = 2000;
/** Listings not seen by a price check for this long are hidden (shop blocked us or page gone). */
export const FRESH_DAYS = 10;
const HISTORY_POINTS = 40;
const WAIST: WaistClass[] = ["regular", "mid-wide", "wide"];

type WireSize = [label: string, inStock: 0 | 1, lengthCm: number, waist: number, widthIn: number | null, volumeL: number | null, price: number | null];
type WirePoint = [date: string, price: number, inStock: 0 | 1];
interface WireListing { i: string; b: string; r: string; u: string; p: number; c: string; l: number | null; z: WireSize[]; h: WirePoint[]; t: string }

export interface CatalogPart {
  sport: Sport;
  part: number;
  parts: number;
  source: "db" | "mock";
  retailers?: Retailer[];
  boards: BoardModel[];
  listings: WireListing[];
}

/** Daily history → only the days the price or stock changed (what densify() expands again). */
export function changePoints(history: PricePoint[]): PricePoint[] {
  const out: PricePoint[] = [];
  for (const h of history) {
    const last = out[out.length - 1];
    if (!last || last.price !== h.price || last.inStock !== h.inStock) out.push(h);
  }
  return out;
}

/** Buyable (a size in stock) and seen recently. */
export function sellable(listings: Listing[], now = Date.now()): Listing[] {
  const cutoff = now - FRESH_DAYS * 86_400_000;
  return listings.filter((l) => l.sizes.some((z) => z.inStock) && Date.parse(l.lastScrapedAt) >= cutoff);
}

export function toPart(catalog: Catalog, sport: Sport, part: number, source: "db" | "mock", now = Date.now()): CatalogPart {
  const all = sellable(catalog.listings, now).sort((a, b) => a.id.localeCompare(b.id));
  const parts = Math.max(1, Math.ceil(all.length / PART_SIZE));
  const slice = all.slice(part * PART_SIZE, (part + 1) * PART_SIZE);
  const ids = new Set(slice.map((l) => l.boardId));
  return {
    sport, part, parts, source,
    ...(part === 0 ? { retailers: catalog.retailers } : {}),
    boards: catalog.boards.filter((b) => ids.has(b.id)).map((b) => ({ ...b, images: b.images.slice(0, 5) })),
    listings: slice.map((l) => ({
      i: l.id, b: l.boardId, r: l.retailerId, u: l.url, p: l.price.amount, c: l.price.currency, l: l.listPrice, t: l.lastScrapedAt,
      z: l.sizes.map((z) => [z.label, z.inStock ? 1 : 0, z.lengthCm, WAIST.indexOf(z.waist), z.widthIn ?? null, z.volumeL ?? null, z.price ?? null]),
      h: changePoints(l.history).slice(-HISTORY_POINTS).map((h) => [h.date, h.price, h.inStock ? 1 : 0]),
    })),
  };
}

/** Rebuild a catalogue from feed parts (any sports, any order). */
export function fromParts(parts: CatalogPart[], today = new Date().toISOString().slice(0, 10)): Catalog {
  const boards = new Map<string, BoardModel>();
  const listings: Listing[] = [];
  let retailers: Retailer[] = [];
  for (const p of parts) {
    if (p.retailers) retailers = p.retailers;
    for (const b of p.boards) boards.set(b.id, b);
    for (const l of p.listings) {
      const history: PricePoint[] = l.h.map(([date, price, s]) => ({ date, price, inStock: s === 1 }));
      // History is change-only: close it with today's value so charts and "price dropped" reach the present.
      const last = history[history.length - 1];
      if (last && last.date < today) history.push({ date: today, price: last.price, inStock: last.inStock });
      listings.push({
        id: l.i, boardId: l.b, retailerId: l.r, url: l.u, price: { amount: l.p, currency: l.c as Listing["price"]["currency"] }, listPrice: l.l, lastScrapedAt: l.t, history,
        sizes: l.z.map(([label, s, lengthCm, w, widthIn, volumeL, price]): BoardSize => ({
          label, inStock: s === 1, lengthCm, waist: WAIST[w] ?? "regular",
          ...(widthIn !== null ? { widthIn } : {}), ...(volumeL !== null ? { volumeL } : {}), ...(price !== null ? { price } : {}),
        })),
      });
    }
  }
  return { boards: [...boards.values()], listings, retailers };
}
