import { brandKey, modelKey } from "@/scraper/parse/normalize";
import type { BoardModel, CurrencyCode, Deal, DealTier, RiderStyle, RidingStyle } from "./types";

/**
 * Board-level view: one group per board model with all its shop offers,
 * budget status, an explainable "best for you" score and a link to last
 * season's version of the same model.
 */

export interface Budget {
  min: number | null;
  max: number | null;
}
/** Boards up to this much over the max are shown in a separate "slightly over" section. */
export const SLIGHTLY_OVER = 0.1;

export type BudgetStatus = "none" | "in" | "over" | "under" | "out";
export type SortMode = "value" | "price" | "discount";

export interface ValueScore {
  score: number; // 0..100
  reasons: string[]; // strongest first, for display
}

export interface LastSeasonLink {
  boardId: string;
  season: string;
  total: number;
  currency: CurrencyCode;
  retailer: string;
  /** How much cheaper than this board's best offer, 0..1. */
  savingPct: number;
}

export interface BoardGroup {
  id: string;
  board: BoardModel;
  /** Cheapest delivered offer (ties → better grade). */
  best: Deal;
  offers: Deal[];
  tier: DealTier;
  budget: BudgetStatus;
  value: ValueScore;
  lastSeason: LastSeasonLink | null;
}

export function budgetStatus(total: number, b: Budget): BudgetStatus {
  if (b.min === null && b.max === null) return "none";
  if (b.min !== null && total < b.min) return "under";
  if (b.max !== null && total > b.max * (1 + SLIGHTLY_OVER)) return "out";
  if (b.max !== null && total > b.max) return "over";
  return "in";
}

const STYLE_LABEL: Record<RidingStyle, string> = { park: "park", "all-mountain": "all-mountain", freeride: "freeride" };

/**
 * Weighted, explainable score:
 *   35 % style fit · 30 % deal quality · 15 % reviews (shrunk toward 3.8★) · 20 % budget fit
 */
export function valueScore(best: Deal, offers: number, status: BudgetStatus, max: number | null, rawStyle: RiderStyle | null): ValueScore {
  const style: RidingStyle | null = rawStyle === "any" ? null : rawStyle;
  const parts: Array<[weight: number, value: number, reason: string | null]> = [];

  const fit = best.styleFit;
  parts.push([0.35, fit, style && fit >= 0.85 ? `Great fit for ${STYLE_LABEL[style]}` : style && fit >= 0.65 ? `Good fit for ${STYLE_LABEL[style]}` : null]);

  const g = best.grade;
  const atLow = g.vsAllTimeLowPct !== null && g.vsAllTimeLowPct <= 0;
  parts.push([0.3, g.score / 100, atLow ? "Lowest tracked price" : g.discountPct >= 0.2 ? `${Math.round(g.discountPct * 100)}% below MSRP` : null]);

  const r = best.board.reviews;
  const reviewValue = r && r.count > 0 ? (r.average * r.count + 3.8 * 5) / (r.count + 5) / 5 : 0.7;
  parts.push([0.15, reviewValue, r && r.count >= 3 && r.average >= 4.3 ? `★ ${r.average.toFixed(1)} from ${r.count} reviews` : null]);

  const over = max !== null && status === "over" ? (best.landed.total - max) / max : 0;
  const budgetValue = status === "over" ? Math.max(0, 1 - over / SLIGHTLY_OVER) : status === "in" || status === "none" ? 1 : 0;
  parts.push([0.2, budgetValue, status === "in" && max !== null ? "Within budget" : null]);

  const reasons = parts
    .filter((p) => p[2])
    .sort((a, b) => b[0] * b[1] - a[0] * a[1])
    .map((p) => p[2]!);
  if (offers > 1) reasons.push(`Cheapest of ${offers} shops`);
  return { score: Math.round(parts.reduce((s, [w, v]) => s + w * v, 0) * 100), reasons: reasons.slice(0, 3) };
}

/** Same model across seasons: brand + model with any model year removed. */
export const lineageKey = (b: Pick<BoardModel, "brand" | "model">) =>
  `${brandKey(b.brand)}|${modelKey(b.model.replace(/\b20\d{2}(\s*\/\s*(20)?\d{2})?\b/g, " "))}`;

export function groupDeals(deals: Deal[], budget: Budget, style: RiderStyle | null): BoardGroup[] {
  const byBoard = new Map<string, Deal[]>();
  for (const d of deals) byBoard.set(d.board.id, [...(byBoard.get(d.board.id) ?? []), d]);

  const groups: BoardGroup[] = [];
  for (const [id, list] of byBoard) {
    const offers = [...list].sort((a, b) => a.landed.total - b.landed.total || b.grade.score - a.grade.score);
    const best = offers[0];
    const status = budgetStatus(best.landed.total, budget);
    groups.push({
      id,
      board: best.board,
      best,
      offers,
      tier: best.grade.tier,
      budget: status,
      value: valueScore(best, offers.length, status, budget.max, style),
      lastSeason: null,
    });
  }

  // Link each board to the newest older season of the same model, when that one is cheaper.
  const byLineage = new Map<string, BoardGroup[]>();
  for (const g of groups) byLineage.set(lineageKey(g.board), [...(byLineage.get(lineageKey(g.board)) ?? []), g]);
  for (const g of groups) {
    const prev = (byLineage.get(lineageKey(g.board)) ?? [])
      .filter((o) => o.board.season < g.board.season && o.best.landed.currency === g.best.landed.currency)
      .sort((a, b) => b.board.season.localeCompare(a.board.season))[0];
    if (prev && prev.best.landed.total < g.best.landed.total) {
      g.lastSeason = {
        boardId: prev.id,
        season: prev.board.season,
        total: prev.best.landed.total,
        currency: prev.best.landed.currency,
        retailer: prev.best.retailer.name,
        savingPct: 1 - prev.best.landed.total / g.best.landed.total,
      };
    }
  }
  return groups;
}

export function sortGroups(groups: BoardGroup[], mode: SortMode): BoardGroup[] {
  const cmp: Record<SortMode, (a: BoardGroup, b: BoardGroup) => number> = {
    value: (a, b) => b.value.score - a.value.score || a.best.landed.total - b.best.landed.total,
    price: (a, b) => a.best.landed.total - b.best.landed.total,
    discount: (a, b) => b.best.grade.discountPct - a.best.grade.discountPct,
  };
  return [...groups].sort(cmp[mode]);
}

export function countGroupsByTier(groups: BoardGroup[]): Record<DealTier, number> {
  const c: Record<DealTier, number> = { "extremely-good": 0, "very-good": 0, good: 0, normal: 0, bad: 0 };
  for (const g of groups) c[g.tier]++;
  return c;
}
