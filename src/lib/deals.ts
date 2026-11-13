import type { BoardModel, BuyerLocale, Deal, Listing, Retailer, RiderInput, SizeMatch } from "./types";
import { computeStats, gradeDeal } from "./grading";
import { landedCost } from "./pricing/landedCost";
import { convert } from "./pricing/currency";
import { matchSizes, recommend, styleFit, type Recommendation } from "./sizing";

export interface DealsResult {
  source?: "db" | "mock";
  /** Most recent scrape time across returned listings. */
  updatedAt?: string | null;
  locale: BuyerLocale;
  recommendation: Recommendation | null;
  deals: Deal[];
}

/** MSRP in the listing's currency: retailer RRP/compare-at if shown, else the board's best-known MSRP. */
export function effectiveMsrp(listing: Pick<Listing, "listPrice" | "price">, board: Pick<BoardModel, "msrp">): number {
  if (listing.listPrice && listing.listPrice > 0) return listing.listPrice;
  return convert(board.msrp.amount, board.msrp.currency, listing.price.currency);
}

/** Price the rider would actually pay: cheapest matching in-stock size (sizes can be priced differently). */
export function effectivePrice(listing: Listing, matches: SizeMatch[]): number {
  const priced = matches.map((m) => m.size.price).filter((p): p is number => p !== undefined);
  return priced.length ? Math.min(...priced) : listing.price.amount;
}

/**
 * Pipeline: listing → stats → grade (in retailer currency) → landed cost (buyer
 * currency) → rider fit. With a rider, listings with no fitting in-stock size are
 * dropped (wide rule is strict).
 */
export function buildDeals(
  catalog: { boards: BoardModel[]; listings: Listing[]; retailers: Retailer[] },
  locale: BuyerLocale,
  rider: RiderInput | null,
): DealsResult {
  const boards = new Map(catalog.boards.map((b) => [b.id, b]));
  const retailers = new Map(catalog.retailers.map((r) => [r.id, r]));
  const rec = rider ? recommend(rider) : null;
  const deals: Deal[] = [];

  for (const base of catalog.listings) {
    const board = boards.get(base.boardId);
    const retailer = retailers.get(base.retailerId);
    if (!board || !retailer) continue;

    const matchingSizes = rec ? matchSizes(base.sizes.filter((s) => s.inStock), rec) : [];
    if (rec && matchingSizes.length === 0) continue;

    const price = effectivePrice(base, matchingSizes);
    const listing: Listing = price === base.price.amount ? base : { ...base, price: { ...base.price, amount: price } };

    const landed = landedCost(price, retailer, locale);
    if (!landed) continue; // doesn't ship to buyer

    const stats = computeStats(listing.history);
    const grade = gradeDeal(price, effectiveMsrp(listing, board), stats);

    deals.push({
      listing, board, retailer, grade, stats, landed, matchingSizes,
      styleFit: rec && rider ? styleFit(board, rec, rider.style) : 1,
    });
  }

  deals.sort((a, b) => b.grade.score - a.grade.score);
  return { locale, recommendation: rec, deals };
}
