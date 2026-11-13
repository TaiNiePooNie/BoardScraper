import type { BoardModel, BuyerLocale, Deal, Listing, Retailer, RiderInput } from "./types";
import { computeStats, gradeDeal } from "./grading";
import { landedCost } from "./pricing/landedCost";
import { convert } from "./pricing/currency";
import { matchSizes, recommend, styleFit, type Recommendation } from "./sizing";

export interface DealsResult {
  locale: BuyerLocale;
  recommendation: Recommendation | null;
  deals: Deal[];
}

/**
 * Pipeline: listing → stats → grade (in retailer currency, vs MSRP converted) →
 * landed cost (buyer currency) → rider fit. With a rider, listings with no
 * fitting size are dropped (wide rule is strict).
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

  for (const listing of catalog.listings) {
    const board = boards.get(listing.boardId);
    const retailer = retailers.get(listing.retailerId);
    if (!board || !retailer) continue;

    const matchingSizes = rec ? matchSizes(listing.sizes.filter((s) => s.inStock), rec) : [];
    if (rec && matchingSizes.length === 0) continue;

    const landed = landedCost(listing.price.amount, retailer, locale);
    if (!landed) continue; // doesn't ship to buyer

    const stats = computeStats(listing.history);
    const msrpLocal = convert(board.msrp.amount, board.msrp.currency, listing.price.currency);
    const grade = gradeDeal(listing.price.amount, msrpLocal, stats);

    deals.push({
      listing, board, retailer, grade, stats, landed, matchingSizes,
      styleFit: rec && rider ? styleFit(board, rec, rider.style) : 1,
    });
  }

  deals.sort((a, b) => b.grade.score - a.grade.score);
  return { locale, recommendation: rec, deals };
}
