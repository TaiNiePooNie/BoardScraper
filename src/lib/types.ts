import { z } from "zod";

/* ───────────────────────── Rider input ───────────────────────── */

export const RidingStyle = z.enum(["park", "all-mountain", "freeride"]);
export type RidingStyle = z.infer<typeof RidingStyle>;

export const BootSizeSystem = z.enum(["US", "EU"]);
export type BootSizeSystem = z.infer<typeof BootSizeSystem>;

export const SkillLevel = z.enum(["beginner", "intermediate", "advanced", "expert"]);
export type SkillLevel = z.infer<typeof SkillLevel>;

/** Which boards to show: all, men's/unisex, women's-specific or kids'. */
export const FitPreference = z.enum(["any", "mens", "womens", "kids"]);
export type FitPreference = z.infer<typeof FitPreference>;

/** Rider's chosen style; "any" = show boards for every style (sized as all-mountain). */
export const RiderStyle = z.enum(["park", "all-mountain", "freeride", "any"]);
export type RiderStyle = z.infer<typeof RiderStyle>;

/** Which board sport a catalog entry / shopper belongs to. */
export const Sport = z.enum(["snow", "skate", "surf"]);
export type Sport = z.infer<typeof Sport>;
export const SPORTS: readonly Sport[] = Sport.options;

/** Board type within a sport (drives "Shop by type" tiles and the Type filter). */
export const BoardCategory = z.enum([
  // snow
  "all-mountain", "freestyle", "powder", "splitboard",
  // skate
  "deck", "complete", "cruiser", "longboard",
  // surf
  "shortboard", "fish", "midlength", "longboard-surf", "foamie",
]);
export type BoardCategory = z.infer<typeof BoardCategory>;
export const CATEGORIES_BY_SPORT: Record<Sport, readonly BoardCategory[]> = {
  snow: ["all-mountain", "freestyle", "powder", "splitboard"],
  skate: ["deck", "complete", "cruiser", "longboard"],
  surf: ["shortboard", "fish", "midlength", "longboard-surf", "foamie"],
};

/** Skate: what the rider mostly does (drives deck width). */
export const SkateStyle = z.enum(["street", "park", "transition", "cruise", "any"]);
export type SkateStyle = z.infer<typeof SkateStyle>;

/** Surf: the waves the rider usually surfs (drives volume/length). */
export const SurfWaves = z.enum(["small", "medium", "big"]);
export type SurfWaves = z.infer<typeof SurfWaves>;

const SizeRange = z.tuple([z.number(), z.number()]).refine(([a, b]) => a <= b, "min must be ≤ max");

/**
 * One rider, all sports. Snow uses weight/height/boot/style/skill; skate uses
 * bootSize as shoe size + skateStyle; surf uses weight/height/skill + waves.
 */
export const RiderInput = z.object({
  weightKg: z.coerce.number().min(15).max(160),
  heightCm: z.coerce.number().min(80).max(230),
  bootSize: z.coerce.number().min(3).max(52),
  bootSystem: BootSizeSystem.default("US"),
  style: RiderStyle,
  skill: SkillLevel.optional(), // default: intermediate
  fit: FitPreference.optional(), // default: any
  skateStyle: SkateStyle.optional(), // default: street
  waves: SurfWaves.optional(), // default: small
  /** Rider-chosen size range per sport (snow cm, skate in, surf L); default = the recommended range. */
  sizeRange: z
    .object({ snow: SizeRange.optional(), skate: SizeRange.optional(), surf: SizeRange.optional() })
    .partial()
    .optional(),
});
export type RiderInput = z.infer<typeof RiderInput>;

/* ───────────────────────── Board attributes ───────────────────────── */

export const BoardProfile = z.enum([
  "camber",
  "rocker",
  "flat",
  "hybrid-camber", // camber between feet, rocker at tips
  "hybrid-rocker", // rocker between feet, camber at feet
  "directional-camber",
]);
export type BoardProfile = z.infer<typeof BoardProfile>;

export const BoardShape = z.enum(["true-twin", "directional-twin", "directional", "tapered"]);
export type BoardShape = z.infer<typeof BoardShape>;

export const WaistClass = z.enum(["regular", "mid-wide", "wide"]);
export type WaistClass = z.infer<typeof WaistClass>;

/** One purchasable length of a board model (e.g. "156W"). */
export const BoardSize = z.object({
  lengthCm: z.number(),
  waist: WaistClass,
  waistWidthMm: z.number().optional(),
  label: z.string(), // normalized: "156", "156W", "157MW", '8.25"', "5'10\""
  inStock: z.boolean(),
  /** Skate: deck width in inches. */
  widthIn: z.number().optional(),
  /** Surf: board volume in litres (when the shop lists it). */
  volumeL: z.number().optional(),
  /** Per-size price when the retailer prices sizes/colorways differently. */
  price: z.number().optional(),
});
export type BoardSize = z.infer<typeof BoardSize>;

/* ───────────────────────── Money & locale ───────────────────────── */

export const CurrencyCode = z.enum(["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "NZD", "SEK", "NOK", "DKK", "PLN", "JPY", "SGD", "AED", "HKD"]);
export type CurrencyCode = z.infer<typeof CurrencyCode>;

/** ISO-3166 alpha-2. */
export const CountryCode = z.string().length(2).toUpperCase();
export type CountryCode = string;

export const Money = z.object({ amount: z.number(), currency: CurrencyCode });
export type Money = z.infer<typeof Money>;

/* ───────────────────────── Price history ───────────────────────── */

export const PricePoint = z.object({
  /** ISO date (YYYY-MM-DD) */
  date: z.string(),
  price: z.number(),
  inStock: z.boolean().default(true),
});
export type PricePoint = z.infer<typeof PricePoint>;

export const PriceStats = z.object({
  allTimeLow: z.number(),
  allTimeHigh: z.number(),
  median90d: z.number(),
  low90d: z.number(),
  samples: z.number(),
});
export type PriceStats = z.infer<typeof PriceStats>;

/* ───────────────────────── Deal grading ───────────────────────── */

/** Ordered best → worst. Strict: every deal lands in exactly one tier. */
export const DealTier = z.enum(["extremely-good", "very-good", "good", "normal", "bad"]);
export type DealTier = z.infer<typeof DealTier>;
export const DEAL_TIERS: readonly DealTier[] = DealTier.options;

export const DealGrade = z.object({
  tier: DealTier,
  score: z.number().min(0).max(100),
  discountPct: z.number(), // vs MSRP, 0..1
  vsAllTimeLowPct: z.number().nullable(), // (price - ATL) / ATL; 0 = at ATL
  vsMedianPct: z.number().nullable(), // (price - median90d) / median90d
  reasons: z.array(z.string()),
});
export type DealGrade = z.infer<typeof DealGrade>;

/* ───────────────────────── Social proof ───────────────────────── */

export const ReviewSummary = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int(),
  sources: z.array(z.object({ name: z.string(), url: z.string().url().optional(), average: z.number(), count: z.number() })),
});
export type ReviewSummary = z.infer<typeof ReviewSummary>;

export const Ambassador = z.object({
  id: z.string(),
  name: z.string(),
  disciplines: z.array(RidingStyle),
  /** Where we cross-referenced the rider ↔ board link (brand team page, interview, etc.) */
  sourceUrl: z.string().url().optional(),
  confidence: z.enum(["confirmed", "likely"]),
});
export type Ambassador = z.infer<typeof Ambassador>;

/* ───────────────────────── Retailer & listing ───────────────────────── */

export const ShippingRule = z.object({
  /** Destination countries this rule applies to; "*" = rest of world. */
  destinations: z.array(z.string()),
  cost: z.number(),
  freeAbove: z.number().optional(),
  etaDays: z.tuple([z.number(), z.number()]).optional(),
});
export type ShippingRule = z.infer<typeof ShippingRule>;

export const Retailer = z.object({
  id: z.string(),
  name: z.string(),
  homepage: z.string().url(),
  country: CountryCode,
  currency: CurrencyCode,
  /** Whether listed prices already include the retailer's domestic VAT. */
  pricesIncludeVat: z.boolean(),
  /** EU shops that show one VAT-inclusive price to every EU country (absorbing VAT-rate differences). */
  fixedGrossInEu: z.boolean().optional(),
  shipping: z.array(ShippingRule),
});
export type Retailer = z.infer<typeof Retailer>;

/** Canonical board model (brand + model + season), shared across retailers. */
export const BoardModel = z.object({
  id: z.string(),
  sport: Sport.default("snow"),
  category: BoardCategory.nullable().default(null),
  brand: z.string(),
  model: z.string(),
  season: z.string(), // "2025/26"
  /** Specs are parsed from retailer copy and may be unknown. */
  profile: BoardProfile.nullable(),
  shape: BoardShape.nullable(),
  flex: z.number().min(1).max(10).nullable(),
  styles: z.array(RidingStyle),
  /** Best-known MSRP: retailer RRP/compare-at, else highest observed price. */
  msrp: Money,
  images: z.array(z.string()),
  ambassadors: z.array(Ambassador),
  reviews: ReviewSummary.nullable(),
});
export type BoardModel = z.infer<typeof BoardModel>;

/** A specific retailer's offer for a board model — the thing we grade. */
export const Listing = z.object({
  id: z.string(),
  boardId: z.string(),
  retailerId: z.string(),
  url: z.string().url(),
  price: Money, // as shown on the retailer's site
  /** Retailer-displayed RRP / compare-at price, if any. */
  listPrice: z.number().nullable().default(null),
  sizes: z.array(BoardSize),
  history: z.array(PricePoint),
  lastScrapedAt: z.string(),
});
export type Listing = z.infer<typeof Listing>;

/* ───────────────────────── Localized, enriched view model ───────────────────────── */

export const LandedCost = z.object({
  currency: CurrencyCode,
  /** Board price converted to buyer currency, with VAT treatment applied. */
  item: z.number(),
  vat: z.number(),
  vatRate: z.number(),
  vatIncluded: z.boolean(), // whether `item` already contains `vat`
  shipping: z.number(),
  duties: z.number(),
  total: z.number(),
  notes: z.array(z.string()),
});
export type LandedCost = z.infer<typeof LandedCost>;

export const SizeMatch = z.object({
  size: BoardSize,
  /** Absolute distance from the rider's ideal size, in the sport's unit (snow/surf: cm or L, skate: in). */
  deltaCm: z.number(),
  fits: z.boolean(),
});
export type SizeMatch = z.infer<typeof SizeMatch>;

export interface Deal {
  listing: Listing;
  board: BoardModel;
  retailer: Retailer;
  grade: DealGrade;
  stats: PriceStats | null;
  landed: LandedCost;
  /** Sizes of this listing that suit the rider (empty if no rider given). */
  matchingSizes: SizeMatch[];
  /** 0..1 how well the board's flex/profile matches the rider's style. */
  styleFit: number;
}

/* ───────────────────────── Locale context ───────────────────────── */

export interface BuyerLocale {
  country: CountryCode;
  currency: CurrencyCode;
  source: "header" | "timezone" | "accept-language" | "override" | "default";
}
