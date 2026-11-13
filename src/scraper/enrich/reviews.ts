import type { ReviewSummary } from "@/lib/types";

/**
 * Merge per-source ratings into one count-weighted average.
 * Sources: retailer JSON-LD aggregateRating (captured by adapters) + any
 * dedicated review sites added later.
 */
export function aggregateReviews(sources: ReviewSummary["sources"]): ReviewSummary | null {
  const valid = sources.filter((s) => s.count > 0 && s.average > 0);
  if (!valid.length) return null;
  const count = valid.reduce((n, s) => n + s.count, 0);
  const average = valid.reduce((n, s) => n + s.average * s.count, 0) / count;
  return { average: Math.round(average * 10) / 10, count, sources: valid };
}
