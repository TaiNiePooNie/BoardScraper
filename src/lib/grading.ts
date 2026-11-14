import type { DealGrade, DealTier, PricePoint, PriceStats } from "./types";

/**
 * Deal grading.
 *
 * score (0–100) = weighted blend of
 *   • MSRP discount  — 50 % off or more earns the full component
 *   • Historical pos — where today's price sits between the all-time low (100) and the 90-day median (0)
 * With < MIN_HISTORY samples the score falls back to the discount component alone.
 *
 * Guard rails (applied after scoring, can only push a deal DOWN):
 *   • price ≥ MSRP                        → bad
 *   • price > 90-day median by > 5 %       → capped at normal (a "sale" that is really a markup)
 *   • extremely-good requires being within 3 % of the all-time low when history exists
 */

export const TIER_THRESHOLDS: Record<Exclude<DealTier, "bad">, number> = {
  "extremely-good": 85,
  "very-good": 70,
  good: 55,
  normal: 35,
};

const W_DISCOUNT = 0.55;
const W_HISTORY = 0.45;
const FULL_DISCOUNT = 0.5;
const MIN_HISTORY = 5;
const DAY = 86_400_000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function computeStats(history: PricePoint[], now = new Date()): PriceStats | null {
  const pts = history.filter((p) => p.inStock);
  if (pts.length === 0) return null;
  const prices = pts.map((p) => p.price);
  const cutoff = now.getTime() - 90 * DAY;
  const recent = pts.filter((p) => new Date(p.date).getTime() >= cutoff).map((p) => p.price);
  const window = recent.length ? recent : prices;
  return {
    allTimeLow: Math.min(...prices),
    allTimeHigh: Math.max(...prices),
    median90d: median(window),
    low90d: Math.min(...window),
    samples: pts.length,
  };
}

export function tierForScore(score: number): DealTier {
  if (score >= TIER_THRESHOLDS["extremely-good"]) return "extremely-good";
  if (score >= TIER_THRESHOLDS["very-good"]) return "very-good";
  if (score >= TIER_THRESHOLDS.good) return "good";
  if (score >= TIER_THRESHOLDS.normal) return "normal";
  return "bad";
}

const TIER_RANK: Record<DealTier, number> = { "extremely-good": 4, "very-good": 3, good: 2, normal: 1, bad: 0 };
const worse = (a: DealTier, b: DealTier) => (TIER_RANK[a] <= TIER_RANK[b] ? a : b);

export function gradeDeal(price: number, msrp: number, stats: PriceStats | null): DealGrade {
  const reasons: string[] = [];
  const discountPct = msrp > 0 ? clamp01((msrp - price) / msrp) : 0;
  const discountScore = clamp01(discountPct / FULL_DISCOUNT) * 100;
  reasons.push(`${Math.round(discountPct * 100)}% below MSRP`);

  const hasHistory = !!stats && stats.samples >= MIN_HISTORY;
  let historyScore: number | null = null;
  let vsAllTimeLowPct: number | null = null;
  let vsMedianPct: number | null = null;

  // Comparisons against history are only meaningful once we have enough samples.
  if (stats && hasHistory) {
    vsAllTimeLowPct = (price - stats.allTimeLow) / stats.allTimeLow;
    vsMedianPct = (price - stats.median90d) / stats.median90d;
  }
  if (hasHistory && stats) {
    const span = stats.median90d - stats.allTimeLow;
    historyScore = price <= stats.allTimeLow ? 100 : span <= 0 ? 0 : clamp01(1 - (price - stats.allTimeLow) / span) * 100;
    if (price <= stats.allTimeLow) reasons.push("At or below all-time low");
    else reasons.push(`${Math.round(vsAllTimeLowPct! * 100)}% above all-time low`);
  } else {
    reasons.push("Insufficient price history — graded on MSRP discount only");
  }

  const score = Math.round(historyScore === null ? discountScore : discountScore * W_DISCOUNT + historyScore * W_HISTORY);
  let tier = tierForScore(score);

  if (price >= msrp) {
    tier = "bad";
    reasons.push("Not discounted vs MSRP");
  }
  if (vsMedianPct !== null && hasHistory && vsMedianPct > 0.05) {
    tier = worse(tier, "normal");
    reasons.push("Above recent median price — capped at Normal");
  }
  if (tier === "extremely-good" && hasHistory && vsAllTimeLowPct! > 0.03) {
    tier = "very-good";
    reasons.push("Not within 3% of all-time low — capped at Very Good");
  }

  return { tier, score, discountPct, vsAllTimeLowPct, vsMedianPct, reasons };
}

/** Not on sale at all (< 2 % below MSRP). Graded "bad" for tiering, but labelled "Full price" in the UI. */
export const isFullPrice = (g: Pick<DealGrade, "discountPct">) => g.discountPct < 0.02;

export const TIER_LABELS: Record<DealTier, string> = {
  "extremely-good": "Extremely Good",
  "very-good": "Very Good",
  good: "Good",
  normal: "Normal",
  bad: "Bad",
};
