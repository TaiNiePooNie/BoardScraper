import { convert } from "./pricing/currency";
import { fitAllows, matchSizesFor, recommendFor, type SportFit } from "./sizing";
import type { BoardCategory, BoardModel, CurrencyCode, Deal, FitPreference, RiderInput, SizeMatch, Sport } from "./types";

/**
 * Store view model: one product per board model, its offers across shops,
 * plain-language price badges (no tiers) and whether it fits the active rider.
 */

export type BadgeKind = "discount" | "lowest" | "drop" | "fits" | "last-season";
export interface Badge {
  kind: BadgeKind;
  label: string;
}

export interface Product {
  id: string;
  board: BoardModel;
  /** All offers, cheapest delivered first. */
  offers: Deal[];
  /** Offer we show: cheapest that fits the rider (if any fit), else cheapest. */
  best: Deal;
  total: number;
  currency: CurrencyCode;
  /** MSRP converted to the buyer currency (null when unknown or not above price). */
  wasTotal: number | null;
  discountPct: number;
  /** Fitting sizes of the shown offer (rider only). */
  fitSizes: SizeMatch[];
  /** null = no rider, true/false = fits the rider. */
  fits: boolean | null;
  badges: Badge[];
  /** Internal ranking for "Recommended". */
  rank: number;
}

export type SortMode = "recommended" | "price-asc" | "price-desc" | "discount" | "newest";
export const SORT_LABEL: Record<SortMode, string> = {
  recommended: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  discount: "Biggest discount",
  newest: "Newest",
};

export interface StoreFilters {
  q: string;
  fitsMe: boolean;
  category: BoardCategory | null;
  gender: FitPreference;
  brands: string[];
  shops: string[];
  maxPrice: number | null;
  saleOnly: boolean;
}
export const EMPTY_FILTERS: StoreFilters = { q: "", fitsMe: false, category: null, gender: "any", brands: [], shops: [], maxPrice: null, saleOnly: false };

export const CATEGORY_LABEL: Record<BoardCategory, string> = {
  "all-mountain": "All-mountain",
  freestyle: "Freestyle & park",
  powder: "Powder",
  splitboard: "Splitboards",
  deck: "Decks",
  complete: "Completes",
  cruiser: "Cruisers",
  longboard: "Longboards",
  shortboard: "Shortboards",
  fish: "Fish",
  midlength: "Mid-lengths",
  "longboard-surf": "Longboards",
  foamie: "Foamies",
};
export const SPORT_LABEL: Record<Sport, string> = { snow: "Snowboards", skate: "Skateboards", surf: "Surfboards" };
export const SPORT_SHORT: Record<Sport, string> = { snow: "Snow", skate: "Skate", surf: "Surf" };

const seasonYear = (s: string) => Number(/(\d{4})/.exec(s)?.[1] ?? 0);

/** Price fell in the last 14 days (last recorded price below the one before it). */
function recentDrop(d: Deal, now: number): boolean {
  const h = d.listing.history.filter((p) => p.inStock);
  if (h.length < 2) return false;
  const last = h[h.length - 1];
  const prev = [...h].reverse().find((p) => p.price !== last.price);
  if (!prev || prev.price <= last.price) return false;
  const changedAt = h.find((p) => p.date > prev.date && p.price === last.price)?.date ?? last.date;
  return now - Date.parse(changedAt) < 14 * 86_400_000;
}

export function buildProducts(deals: Deal[], sport: Sport, rider: RiderInput | null, now = Date.now()): { products: Product[]; fit: SportFit | null } {
  const fit = rider ? recommendFor(sport, rider) : null;
  const byBoard = new Map<string, Deal[]>();
  for (const d of deals) {
    if (d.board.sport !== sport) continue;
    const list = byBoard.get(d.board.id);
    if (list) list.push(d);
    else byBoard.set(d.board.id, [d]);
  }
  const newest = Math.max(0, ...[...byBoard.values()].map((ds) => seasonYear(ds[0].board.season)));

  const products: Product[] = [];
  for (const [id, raw] of byBoard) {
    const offers = [...raw].sort((a, b) => a.landed.total - b.landed.total);
    const board = offers[0].board;
    let best = offers[0];
    let fitSizes: SizeMatch[] = [];
    let fits: boolean | null = null;
    // Skate boards sold by length only (most cruisers/longboards) can't be width-matched: fit unknown, never hidden.
    const sizeless = sport === "skate" && !offers.some((o) => o.listing.sizes.some((sz) => sz.widthIn !== undefined));
    if (fit && rider && !(sizeless && fitAllows(rider.fit, board.model))) {
      fits = false;
      if (fitAllows(rider.fit, board.model)) {
        for (const o of offers) {
          const m = matchSizesFor(o.listing.sizes.filter((s) => s.inStock), fit);
          if (m.length) {
            best = o;
            fitSizes = m;
            fits = true;
            break;
          }
        }
      }
    }
    const currency = best.landed.currency;
    const total = best.landed.total;
    const msrpLocal = best.grade.discountPct > 0 ? best.listing.price.amount / (1 - best.grade.discountPct) : null;
    const wasTotal = msrpLocal ? Math.round(total + convert(msrpLocal - best.listing.price.amount, best.listing.price.currency, currency)) : null;
    const discountPct = best.grade.discountPct;

    const badges: Badge[] = [];
    if (fits) badges.push({ kind: "fits", label: "Fits you" });
    if (discountPct >= 0.1) badges.push({ kind: "discount", label: `−${Math.round(discountPct * 100)}%` });
    const s = best.stats;
    if (s && s.samples >= 5 && best.listing.price.amount <= s.low90d * 1.005 && s.low90d < s.allTimeHigh) badges.push({ kind: "lowest", label: "Lowest in 90 days" });
    else if (recentDrop(best, now)) badges.push({ kind: "drop", label: "Price dropped" });
    if (newest && seasonYear(board.season) && seasonYear(board.season) < newest) badges.push({ kind: "last-season", label: "Last season" });

    const reviews = board.reviews ? (board.reviews.average - 3.5) * 4 * Math.min(1, board.reviews.count / 20) : 0;
    const rank = (fits ? 100 : 0) + best.grade.score * 0.6 + best.styleFit * 20 + reviews;
    products.push({ id, board, offers, best, total, currency, wasTotal: wasTotal && wasTotal > total ? wasTotal : null, discountPct, fitSizes, fits, badges, rank });
  }
  return { products, fit };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filterProducts(products: Product[], f: StoreFilters): Product[] {
  const words = norm(f.q).split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (f.fitsMe && p.fits === false) return false;
    if (f.category && p.board.category !== f.category) return false;
    if (f.gender !== "any" && !fitAllows(f.gender, p.board.model)) return false;
    if (f.brands.length && !f.brands.includes(p.board.brand)) return false;
    if (f.shops.length && !p.offers.some((o) => f.shops.includes(o.retailer.id))) return false;
    if (f.maxPrice !== null && p.total > f.maxPrice) return false;
    if (f.saleOnly && p.discountPct < 0.1) return false;
    if (words.length) {
      const hay = norm(`${p.board.brand} ${p.board.model} ${p.board.season} ${p.board.category ?? ""}`);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

export function sortProducts(products: Product[], mode: SortMode): Product[] {
  const out = [...products];
  switch (mode) {
    case "price-asc": return out.sort((a, b) => a.total - b.total);
    case "price-desc": return out.sort((a, b) => b.total - a.total);
    case "discount": return out.sort((a, b) => b.discountPct - a.discountPct);
    case "newest": return out.sort((a, b) => seasonYear(b.board.season) - seasonYear(a.board.season) || b.rank - a.rank);
    default: return out.sort((a, b) => b.rank - a.rank);
  }
}

/** Facets for the filter sheet (from the sport's products, before filtering). */
export function storeFacets(products: Product[]) {
  const brands = new Map<string, number>();
  const shops = new Map<string, { name: string; n: number }>();
  const cats = new Map<BoardCategory, number>();
  let maxTotal = 0;
  for (const p of products) {
    brands.set(p.board.brand, (brands.get(p.board.brand) ?? 0) + 1);
    if (p.board.category) cats.set(p.board.category, (cats.get(p.board.category) ?? 0) + 1);
    for (const o of p.offers) {
      const s = shops.get(o.retailer.id);
      if (s) s.n++;
      else shops.set(o.retailer.id, { name: o.retailer.name, n: 1 });
    }
    maxTotal = Math.max(maxTotal, p.total);
  }
  return {
    brands: [...brands.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    shops: [...shops.entries()].map(([id, v]) => ({ id, ...v })),
    categories: cats,
    maxTotal: Math.ceil(maxTotal / 50) * 50,
  };
}

export const activeFilterCount = (f: StoreFilters) =>
  (f.fitsMe ? 1 : 0) + (f.gender !== "any" ? 1 : 0) + f.brands.length + f.shops.length + (f.maxPrice !== null ? 1 : 0) + (f.saleOnly ? 1 : 0);
