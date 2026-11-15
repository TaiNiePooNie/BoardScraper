import { brandKey, modelKey } from "@/scraper/parse/normalize";
import { convert } from "./pricing/currency";
import { audienceAllows, matchSizesFor, recommendFor, riderFits, type SportFit } from "./sizing";
import { Audience as AudienceSchema, BoardCategory as CategorySchema, Sport as SportSchema, type Audience, type BoardCategory, type BoardModel, type BoardSize, type CurrencyCode, type Deal, type RiderInput, type SizeMatch, type Sport } from "./types";

/**
 * Store view model: one product per board model, its offers across shops,
 * plain-language price badges (no tiers) and whether it fits the active rider.
 */

export type BadgeKind = "discount" | "lowest" | "drop" | "fits" | "last-season" | "stock";
export interface Badge {
  kind: BadgeKind;
  label: string;
  /** Shorter wording for narrow product cards. */
  short?: string;
}

export interface Product {
  /** Display board id (newest season); `boardIds` has every merged duplicate. */
  id: string;
  boardIds: string[];
  board: BoardModel;
  /** All offers, cheapest delivered first. */
  offers: Deal[];
  /** Offer we show: cheapest that fits the rider (if any fit), else cheapest. */
  best: Deal;
  total: number;
  currency: CurrencyCode;
  /** MSRP converted to the buyer currency (null when unknown or not above price). */
  wasTotal: number | null;
  /** Where the "was" price comes from: a shop's/brand's RRP, or the highest price we've recorded. */
  wasSource: "rrp" | "history" | null;
  discountPct: number;
  /** How much the shown offer's price fell in the last 14 days (0..1; 0 = no recent drop). */
  dropPct: number;
  /** Fitting sizes of the shown offer (rider only). */
  fitSizes: SizeMatch[];
  /** null = no rider, true/false = fits the rider. */
  fits: boolean | null;
  badges: Badge[];
  stock: StockInfo;
  /** Internal ranking for "Recommended". */
  rank: number;
}

/**
 * How scarce a board is. Shops publish in-stock/sold-out per size, not unit counts, so
 * scarcity = sold-out sizes across all shops + how many shops still have the rider's size.
 * Last season's boards aren't restocked, which makes low stock urgent.
 */
export interface StockInfo {
  /** Distinct sizes in stock at any shop / listed at any shop. */
  sizesLeft: number;
  sizesTotal: number;
  /** Shops that have the rider's size in stock (null without a rider). */
  shopsWithYourSize: number | null;
  shops: number;
  lastSeason: boolean;
  /** ok · low (could sell out) · last (likely gone for good soon). */
  level: "ok" | "low" | "last";
  /** One line for the board page, or null when stock is fine. */
  note: string | null;
}

export function stockInfo(offers: Deal[], fitLabels: Set<string> | null, lastSeason: boolean): StockInfo {
  const all = new Set<string>();
  const left = new Set<string>();
  for (const o of offers) for (const z of o.listing.sizes) {
    all.add(z.label);
    if (z.inStock) left.add(z.label);
  }
  const shops = new Set(offers.map((o) => o.retailer.id)).size;
  const shopsWithYourSize = fitLabels
    ? new Set(offers.filter((o) => o.listing.sizes.some((z) => z.inStock && fitLabels.has(z.label))).map((o) => o.retailer.id)).size
    : null;
  const share = all.size ? left.size / all.size : 1;
  // Thresholds keep the label rare enough to mean something.
  const few = all.size >= 4 && (share <= 0.25 || left.size <= 1);
  const yoursScarce = shopsWithYourSize === 1 && shops > 1;
  let level: StockInfo["level"] = "ok";
  if (lastSeason && all.size >= 3 && (share <= 0.4 || left.size <= 2 || yoursScarce)) level = "last";
  else if (few || yoursScarce) level = "low";
  const sizesTxt = `${left.size} of ${all.size} size${all.size === 1 ? "" : "s"} left`;
  const yours = shopsWithYourSize === 1 ? `your size is only in stock at 1 shop` : null;
  const note =
    level === "last"
      ? `Last season's board: ${[yours, all.size >= 3 ? sizesTxt : null].filter(Boolean).join(", ") || "stock is running out"}. These usually aren't restocked once they sell out.`
      : level === "low"
        ? `Selling out: ${[yours, few ? sizesTxt : null].filter(Boolean).join(", ")}. Popular sizes can take weeks to come back.`
        : null;
  return { sizesLeft: left.size, sizesTotal: all.size, shopsWithYourSize, shops, lastSeason, level, note };
}

const GENERIC_WORDS = /\b(snow|skate|surf)?boards?\b|\bsplitboards?\b|\bskateboard\b|\bsurfboard\b|\bsnowboard\b/g;

/**
 * Same board across shops and seasons: sport + brand + model with years, "snowboard"/"board"
 * words and punctuation removed (gender stays, so women's and men's versions stay apart).
 * Skate decks and completes stay separate products.
 */
export function productKey(b: Pick<BoardModel, "sport" | "brand" | "model" | "category">): string {
  const model = b.model.toLowerCase().replace(/\b20\d{2}(\s*[/-]\s*(20)?\d{2})?\b/g, " ").replace(GENERIC_WORDS, " ");
  const kind = b.sport === "skate" ? (b.category === "deck" ? "deck" : "set") : "";
  return `${b.sport}|${kind}|${brandKey(b.brand)}|${modelKey(model)}`;
}

export type SortMode = "recommended" | "price-asc" | "price-desc" | "discount" | "drop" | "newest";
export const SORT_LABEL: Record<SortMode, string> = {
  recommended: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  discount: "Biggest discount",
  drop: "Biggest price drop",
  newest: "Newest",
};

export interface StoreFilters {
  q: string;
  fitsMe: boolean;
  category: BoardCategory | null;
  /** Kids / men / women (several allowed; empty = all). Skate & surf: kids vs adults. */
  audience: Audience[];
  brands: string[];
  /** Board colours from the photo (any of). */
  colors: string[];
  shops: string[];
  maxPrice: number | null;
  /** Least discount off the original price, 0..1 (0 = off; MIN_DISCOUNT = anything "on sale"). */
  minDiscount: number;
  /** Price fell in the last 14 days. */
  priceDrop: boolean;
  /** At its lowest price in 90 days. */
  lowest: boolean;
  /** Selling out ("Few left" / "Last sizes"). */
  lastSizes: boolean;
}
export const EMPTY_FILTERS: StoreFilters = { q: "", fitsMe: false, category: null, audience: [], brands: [], colors: [], shops: [], maxPrice: null, minDiscount: 0, priceDrop: false, lowest: false, lastSizes: false };

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

/** How much the price fell in the last 14 days (last recorded price vs. the one before it), 0..1; 0 = no recent drop. */
function recentDrop(d: Deal, now: number): number {
  const h = d.listing.history.filter((p) => p.inStock);
  if (h.length < 2) return 0;
  const last = h[h.length - 1];
  const prev = [...h].reverse().find((p) => p.price !== last.price);
  if (!prev || prev.price <= last.price) return 0;
  const changedAt = h.find((p) => p.date > prev.date && p.price === last.price)?.date ?? last.date;
  return now - Date.parse(changedAt) < 14 * 86_400_000 ? 1 - last.price / prev.price : 0;
}

/** Smallest discount we label (rounding noise and tiny currency moves below this). */
export const MIN_DISCOUNT = 0.03;
/** Discount steps offered in the filter sheet ("On sale" = any labelled discount). */
export const DISCOUNT_STEPS = [MIN_DISCOUNT, 0.2, 0.3, 0.5] as const;

/**
 * Original price for the shown offer, in that offer's currency, from everything we know:
 *  1. RRP: every shop's own "was"/compare-at price for this board and the board's best-known MSRP;
 *  2. otherwise the highest price any shop has charged for it (price history).
 * Values above 3× the price are ignored as data errors.
 */
export function referencePrice(best: Deal, offers: Deal[]): { price: number; source: "rrp" | "history" } | null {
  const cur = best.listing.price.currency;
  const price = best.listing.price.amount;
  const ok = (v: number) => v > price * (1 + MIN_DISCOUNT / 2) && v < price * 3;
  const rrp: number[] = [];
  const seen: number[] = [];
  const msrp = best.board.msrp;
  if (msrp?.amount) rrp.push(convert(msrp.amount, msrp.currency, cur));
  for (const o of offers) {
    const c = o.listing.price.currency;
    if (o.listing.listPrice) rrp.push(convert(o.listing.listPrice, c, cur));
    const high = Math.max(o.listing.price.amount, o.stats?.allTimeHigh ?? 0, ...o.listing.history.map((h) => h.price));
    seen.push(convert(high, c, cur));
  }
  const r = Math.max(0, ...rrp.filter(ok));
  if (r) return { price: r, source: "rrp" };
  const h = Math.max(0, ...seen.filter(ok));
  return h ? { price: h, source: "history" } : null;
}

export function buildProducts(deals: Deal[], sport: Sport, rider: RiderInput | null, now = Date.now()): { products: Product[]; fit: SportFit | null } {
  const fit = rider ? recommendFor(sport, rider) : null;
  // One product per board, even when shops or seasons name it differently (see productKey).
  const byKey = new Map<string, Deal[]>();
  for (const d of deals) {
    if (d.board.sport !== sport) continue;
    const k = productKey(d.board);
    const list = byKey.get(k);
    if (list) list.push(d);
    else byKey.set(k, [d]);
  }
  const newest = Math.max(0, ...deals.filter((d) => d.board.sport === sport).map((d) => seasonYear(d.board.season)));

  const products: Product[] = [];
  for (const raw of byKey.values()) {
    const sorted = [...raw].sort((a, b) => a.landed.total - b.landed.total);
    // Display board: newest season, then most specs known; missing specs filled from the others.
    const boards = [...new Map(raw.map((d) => [d.board.id, d.board])).values()];
    const specCount = (b: BoardModel) => [b.profile, b.shape, b.flex, b.category].filter((x) => x !== null).length + b.images.length / 100;
    const main = [...boards].sort((a, b) => seasonYear(b.season) - seasonYear(a.season) || specCount(b) - specCount(a))[0];
    const board: BoardModel = {
      ...main,
      profile: main.profile ?? boards.find((b) => b.profile)?.profile ?? null,
      shape: main.shape ?? boards.find((b) => b.shape)?.shape ?? null,
      flex: main.flex ?? boards.find((b) => b.flex)?.flex ?? null,
      category: main.category ?? boards.find((b) => b.category)?.category ?? null,
      images: main.images.length ? main.images : boards.find((b) => b.images.length)?.images ?? [],
      reviews: main.reviews ?? boards.find((b) => b.reviews)?.reviews ?? null,
    };
    const id = main.id;
    const boardIds = boards.map((b) => b.id);

    // Skate boards sold by length only (most cruisers/longboards) can't be width-matched: fit unknown, never hidden.
    const sizeless = sport === "skate" && !raw.some((o) => o.listing.sizes.some((sz) => sz.widthIn !== undefined));
    const forRider = rider ? audienceAllows(riderFits(rider), sport, board.model) : true;
    const matchOf = new Map<Deal, SizeMatch[]>();
    if (fit && rider && forRider) for (const o of sorted) matchOf.set(o, matchSizesFor(o.listing.sizes.filter((z) => z.inStock), fit));
    // One offer per shop (a shop can list the same board on two pages): the one that fits, else the cheapest.
    // Its sizes are combined, each size keeping its own page and price (some shops list one page per size).
    const shopDeals = new Map<string, Deal[]>();
    for (const o of sorted) shopDeals.set(o.retailer.id, [...(shopDeals.get(o.retailer.id) ?? []), o]);
    const offers: Deal[] = [];
    for (const list of shopDeals.values()) {
      const base = list.find((o) => matchOf.get(o)?.length) ?? list[0];
      if (list.length === 1) { offers.push(base); continue; }
      const sizes = new Map<string, BoardSize>();
      for (const o of [base, ...list.filter((x) => x !== base)]) {
        for (const z of o.listing.sizes) {
          const cur = sizes.get(z.label);
          const sized: BoardSize = { ...z, price: z.price ?? o.listing.price.amount, url: o.listing.url !== base.listing.url ? o.listing.url : z.url };
          if (!cur || (!cur.inStock && z.inStock)) sizes.set(z.label, sized);
        }
      }
      const merged = { ...base, listing: { ...base.listing, sizes: [...sizes.values()] } };
      offers.push(merged);
      if (matchOf.has(base)) matchOf.set(merged, matchSizesFor(merged.listing.sizes.filter((z) => z.inStock), fit!));
    }
    offers.sort((a, b) => a.landed.total - b.landed.total);

    let best = offers[0];
    let fitSizes: SizeMatch[] = [];
    let fits: boolean | null = null;
    if (fit && rider && !(sizeless && forRider)) {
      fits = false;
      const hit = offers.find((o) => matchOf.get(o)?.length);
      if (hit) {
        best = hit;
        fitSizes = matchOf.get(hit)!;
        fits = true;
      }
    }
    const currency = best.landed.currency;
    const total = best.landed.total;
    const ref = referencePrice(best, offers);
    const discountPct = ref ? 1 - best.listing.price.amount / ref.price : 0;
    const wasTotal = ref ? Math.round(total + convert(ref.price - best.listing.price.amount, best.listing.price.currency, currency)) : null;

    const badges: Badge[] = [];
    if (fits) badges.push({ kind: "fits", label: "Fits you" });
    if (discountPct >= MIN_DISCOUNT) badges.push({ kind: "discount", label: `−${Math.round(discountPct * 100)}%` });
    const s = best.stats;
    const dropPct = recentDrop(best, now);
    if (s && s.samples >= 5 && best.listing.price.amount <= s.low90d * 1.005 && s.low90d < s.allTimeHigh) badges.push({ kind: "lowest", label: "Lowest in 90 days", short: "90-day low" });
    else if (dropPct > 0) badges.push({ kind: "drop", label: "Price dropped" });
    const lastSeason = !!(newest && seasonYear(best.board.season) && seasonYear(best.board.season) < newest);
    const stock = stockInfo(raw, fit && rider ? new Set(fitSizes.map((m) => m.size.label)) : null, lastSeason);
    if (stock.level !== "ok") badges.splice(fits ? 1 : 0, 0, { kind: "stock", label: stock.level === "last" ? "Last sizes" : "Few left" });
    if (lastSeason) badges.push({ kind: "last-season", label: "Last season" });

    const reviews = board.reviews ? (board.reviews.average - 3.5) * 4 * Math.min(1, board.reviews.count / 20) : 0;
    const rank = (fits ? 100 : 0) + best.grade.score * 0.6 + best.styleFit * 20 + reviews;
    products.push({ id, boardIds, board, offers, best, total, currency, wasTotal: wasTotal && wasTotal > total && discountPct >= MIN_DISCOUNT ? wasTotal : null, wasSource: discountPct >= MIN_DISCOUNT ? ref?.source ?? null : null, discountPct: discountPct >= MIN_DISCOUNT ? discountPct : 0, dropPct, fitSizes, fits, badges, stock, rank });
  }
  return { products, fit };
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export function filterProducts(products: Product[], f: StoreFilters): Product[] {
  const words = norm(f.q).split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (f.fitsMe && p.fits === false) return false;
    if (f.category && p.board.category !== f.category) return false;
    if (f.audience.length && !audienceAllows(f.audience, p.board.sport, p.board.model)) return false;
    if (f.brands.length && !f.brands.includes(p.board.brand)) return false;
    if (f.colors.length && !p.board.colors?.some((c) => f.colors.includes(c))) return false;
    if (f.shops.length && !p.offers.some((o) => f.shops.includes(o.retailer.id))) return false;
    if (f.maxPrice !== null && p.total > f.maxPrice) return false;
    if (f.minDiscount > 0 && p.discountPct < f.minDiscount) return false;
    if (f.priceDrop && p.dropPct <= 0) return false;
    if (f.lowest && !p.badges.some((b) => b.kind === "lowest")) return false;
    if (f.lastSizes && p.stock.level === "ok") return false;
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
    case "discount": return out.sort((a, b) => b.discountPct - a.discountPct || b.rank - a.rank);
    case "drop": return out.sort((a, b) => b.dropPct - a.dropPct || b.discountPct - a.discountPct || b.rank - a.rank);
    case "newest": return out.sort((a, b) => seasonYear(b.board.season) - seasonYear(a.board.season) || b.rank - a.rank);
    default: return out.sort((a, b) => b.rank - a.rank);
  }
}

/** Facets for the filter sheet (from the sport's products, before filtering). */
export function storeFacets(products: Product[]) {
  const brands = new Map<string, number>();
  const colors = new Map<string, number>();
  const shops = new Map<string, { name: string; n: number }>();
  const cats = new Map<BoardCategory, number>();
  let maxTotal = 0;
  for (const p of products) {
    brands.set(p.board.brand, (brands.get(p.board.brand) ?? 0) + 1);
    for (const c of p.board.colors ?? []) colors.set(c, (colors.get(c) ?? 0) + 1);
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
    colors,
    shops: [...shops.entries()].map(([id, v]) => ({ id, ...v })),
    categories: cats,
    maxTotal: Math.ceil(maxTotal / 50) * 50,
  };
}

/** Filters counted on the Filter button (search and category have their own UI). */
export const activeFilterCount = (f: StoreFilters) =>
  (f.fitsMe ? 1 : 0) + (f.audience.length ? 1 : 0) + f.brands.length + f.colors.length + f.shops.length + (f.maxPrice !== null ? 1 : 0)
  + (f.minDiscount > 0 ? 1 : 0) + (f.priceDrop ? 1 : 0) + (f.lowest ? 1 : 0) + (f.lastSizes ? 1 : 0);

/* ── URL state: a filtered view can be shared, bookmarked and survives a reload ── */

export interface StoreView {
  sport: Sport;
  filters: StoreFilters;
  sort: SortMode;
}

/**
 * Query string for a view: `sport` always, everything else only when it differs from the default.
 * sport · type (category) · q · sort · sale (min % off; 1 = any) · drop · low · last · fits · max · for · brand · shop
 */
export function viewToQuery({ sport, filters: f, sort }: StoreView): URLSearchParams {
  const q = new URLSearchParams();
  q.set("sport", sport);
  if (f.category) q.set("type", f.category);
  if (f.q.trim()) q.set("q", f.q.trim());
  if (sort !== "recommended") q.set("sort", sort);
  if (f.minDiscount > 0) q.set("sale", f.minDiscount <= MIN_DISCOUNT ? "1" : String(Math.round(f.minDiscount * 100)));
  if (f.priceDrop) q.set("drop", "1");
  if (f.lowest) q.set("low", "1");
  if (f.lastSizes) q.set("last", "1");
  if (f.fitsMe) q.set("fits", "1");
  if (f.maxPrice !== null) q.set("max", String(f.maxPrice));
  for (const a of f.audience) q.append("for", a);
  for (const b of f.brands) q.append("brand", b);
  for (const c of f.colors) q.append("color", c);
  for (const s of f.shops) q.append("shop", s);
  return q;
}

/** Reads a view back from a query string; unknown or broken values fall back to the defaults. */
export function viewFromQuery(q: URLSearchParams): { sport: Sport | null; filters: StoreFilters; sort: SortMode } {
  const sport = SportSchema.safeParse(q.get("sport"));
  const category = CategorySchema.safeParse(q.get("type"));
  const sort = q.get("sort") as SortMode | null;
  const sale = Number(q.get("sale"));
  const max = Number(q.get("max"));
  const on = (k: string) => q.get(k) === "1";
  return {
    sport: sport.success ? sport.data : null,
    sort: sort && Object.hasOwn(SORT_LABEL, sort) ? sort : "recommended",
    filters: {
      q: (q.get("q") ?? "").slice(0, 80),
      category: category.success ? category.data : null,
      minDiscount: !Number.isFinite(sale) || sale <= 0 ? 0 : sale <= 1 ? MIN_DISCOUNT : Math.min(0.9, sale / 100),
      priceDrop: on("drop"),
      lowest: on("low"),
      lastSizes: on("last"),
      fitsMe: on("fits"),
      maxPrice: q.has("max") && Number.isFinite(max) && max > 0 ? max : null,
      audience: q.getAll("for").filter((a): a is Audience => AudienceSchema.safeParse(a).success),
      brands: q.getAll("brand").slice(0, 30),
      colors: q.getAll("color").slice(0, 11),
      shops: q.getAll("shop").slice(0, 60),
    },
  };
}
