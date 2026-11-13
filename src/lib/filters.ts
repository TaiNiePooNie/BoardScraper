import type { BoardProfile, Deal, DealTier, WaistClass } from "./types";

export interface DealFilters {
  minDiscountPct: number; // 0..100
  maxTotal: number | null; // buyer currency, incl. shipping/VAT/duties
  lengths: number[]; // empty = any
  waist: WaistClass | "any";
  flex: [number, number];
  profiles: BoardProfile[];
  brands: string[];
  riders: string[];
  retailers: string[];
  minRating: number; // 0..5
  query: string;
}

export const DEFAULT_FILTERS: DealFilters = {
  minDiscountPct: 0,
  maxTotal: null,
  lengths: [],
  waist: "any",
  flex: [1, 10],
  profiles: [],
  brands: [],
  riders: [],
  retailers: [],
  minRating: 0,
  query: "",
};

const sizesOf = (d: Deal) => (d.matchingSizes.length ? d.matchingSizes.map((m) => m.size) : d.listing.sizes);

export function applyFilters(deals: Deal[], f: DealFilters): Deal[] {
  const q = f.query.trim().toLowerCase();
  return deals.filter((d) => {
    if (d.grade.discountPct * 100 < f.minDiscountPct) return false;
    if (f.maxTotal !== null && d.landed.total > f.maxTotal) return false;
    const flexFiltered = f.flex[0] > 1 || f.flex[1] < 10;
    if (d.board.flex === null ? flexFiltered : d.board.flex < f.flex[0] || d.board.flex > f.flex[1]) return false;
    if (f.profiles.length && (d.board.profile === null || !f.profiles.includes(d.board.profile))) return false;
    if (f.brands.length && !f.brands.includes(d.board.brand)) return false;
    if (f.retailers.length && !f.retailers.includes(d.retailer.id)) return false;
    if (f.riders.length && !d.board.ambassadors.some((a) => f.riders.includes(a.name))) return false;
    if (f.minRating > 0 && (d.board.reviews?.average ?? 0) < f.minRating) return false;
    const sizes = sizesOf(d);
    if (f.waist !== "any" && !sizes.some((s) => s.waist === f.waist)) return false;
    if (f.lengths.length && !sizes.some((s) => f.lengths.includes(s.lengthCm))) return false;
    if (q && !`${d.board.brand} ${d.board.model} ${d.retailer.name}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function countByTier(deals: Deal[]): Record<DealTier, number> {
  const c: Record<DealTier, number> = { "extremely-good": 0, "very-good": 0, good: 0, normal: 0, bad: 0 };
  for (const d of deals) c[d.grade.tier]++;
  return c;
}

/** Facet values present in the current result set, for building filter controls. */
export function facets(deals: Deal[]) {
  const uniq = <T,>(xs: T[]) => [...new Set(xs)].sort();
  return {
    brands: uniq(deals.map((d) => d.board.brand)),
    riders: uniq(deals.flatMap((d) => d.board.ambassadors.map((a) => a.name))),
    retailers: [...new Map(deals.map((d) => [d.retailer.id, d.retailer.name])).entries()],
    lengths: uniq(deals.flatMap((d) => sizesOf(d).map((s) => s.lengthCm))).sort((a, b) => a - b),
    profiles: uniq(deals.flatMap((d) => (d.board.profile ? [d.board.profile] : []))),
  };
}
