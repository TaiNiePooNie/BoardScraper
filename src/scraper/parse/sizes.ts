import type { BoardSize, Sport } from "@/lib/types";

/**
 * Parses size labels: "156", "156W", "155W cm", "158 Wide", "159MW", "157 (Mid-Wide)", "162 W".
 * Rejects non-board lengths (kids < 100 cm handled by caller via MIN/MAX).
 */
export const MIN_LENGTH = 80; // kids boards start around 80–90 cm
export const MAX_LENGTH = 200;

export function parseSizeLabel(label: string, inStock = true, price?: number): BoardSize | null {
  const m = label.match(/(\d{3})(?:[.,]\d)?\s*(?:cm)?\s*(mw\b|mid[- ]?wide|w\b|wide|x?w(?=\s|$))?/i);
  if (!m) return null;
  const lengthCm = Number(m[1]);
  if (lengthCm < MIN_LENGTH || lengthCm > MAX_LENGTH) return null;
  const tag = (m[2] ?? "").toLowerCase();
  const waist = tag.startsWith("m") ? "mid-wide" : tag ? "wide" : "regular";
  const suffix = waist === "wide" ? "W" : waist === "mid-wide" ? "MW" : "";
  return { lengthCm, waist, label: `${lengthCm}${suffix}`, inStock, ...(price !== undefined ? { price } : {}) };
}

/** Merge duplicate sizes (e.g. same length in several colorways): in stock if any is, cheapest in-stock price. */
export function mergeSizes(sizes: BoardSize[]): BoardSize[] {
  const by = new Map<string, BoardSize>();
  for (const s of sizes) {
    const prev = by.get(s.label);
    if (!prev) {
      by.set(s.label, { ...s });
      continue;
    }
    const better = (s.inStock && !prev.inStock) || (s.inStock === prev.inStock && (s.price ?? Infinity) < (prev.price ?? Infinity));
    by.set(s.label, better ? { ...s, inStock: s.inStock || prev.inStock } : { ...prev, inStock: s.inStock || prev.inStock });
  }
  return [...by.values()].sort((a, b) => a.lengthCm - b.lengthCm || (a.widthIn ?? 0) - (b.widthIn ?? 0) || a.label.localeCompare(b.label));
}

/** Lowest in-stock price, falling back to lowest overall. */
export function headlinePrice(sizes: BoardSize[], fallback: number[]): number | null {
  const inStock = sizes.filter((s) => s.inStock && s.price !== undefined).map((s) => s.price!);
  const all = sizes.filter((s) => s.price !== undefined).map((s) => s.price!).concat(fallback);
  const pool = inStock.length ? inStock : all;
  return pool.length ? Math.min(...pool) : null;
}

/* ───────────────────────── Skate & surf ───────────────────────── */

const IN_CM = 2.54;
/** Skate deck widths (in): micro/kids decks ~6", wide cruisers/longboards up to ~10.5". */
export const DECK_WIDTH_IN: [number, number] = [5.5, 11];
/** Skate deck lengths (in): mini cruisers ~22" to longboards ~60". */
export const DECK_LENGTH_IN: [number, number] = [20, 60];

const fmtNum = (n: number) => String(Number(n.toFixed(4)));
const inch = String.raw`(?:"|″|”|''|\s*in(?:ch(?:es)?)?\b)`;
const NUM = String.raw`(\d{1,2}(?:[.,]\d{1,4})?)`;

/** Width/length (inches) in a skate label or title: '8.25"', "8.25 in", "8.25", '8.5" x 32"', "36 X9.25", '44″'. */
export function skateDims(label: string): { widthIn?: number; lengthIn?: number } {
  const t = label.replace(/(\d),(\d)/g, "$1.$2");
  const out: { widthIn?: number; lengthIn?: number } = {};
  // "W x L" or "L x W" pairs first.
  const pair = t.match(new RegExp(String.raw`(?<![\w.])${NUM}${inch}?\s*[x×]\s*${NUM}${inch}?(?![\w.])`, "i"));
  const nums: number[] = pair ? [Number(pair[1]), Number(pair[2])] : [];
  if (!pair) {
    for (const m of t.matchAll(new RegExp(String.raw`(?<![\w.'’])${NUM}(${inch})?(?![\w.'’]|\s*(?:mm|cm|ft|l\b|liter|litre|kg|lb))`, "gi"))) nums.push(Number(m[1]));
  }
  for (const n of nums) {
    if (out.widthIn === undefined && n >= DECK_WIDTH_IN[0] && n <= DECK_WIDTH_IN[1]) out.widthIn = n;
    else if (out.lengthIn === undefined && n >= DECK_LENGTH_IN[0] && n <= DECK_LENGTH_IN[1]) out.lengthIn = n;
  }
  return out;
}

export function skateSize(dims: { widthIn?: number; lengthIn?: number }, inStock = true, price?: number): BoardSize | null {
  const { widthIn, lengthIn } = dims;
  if (widthIn === undefined && lengthIn === undefined) return null;
  return {
    lengthCm: lengthIn !== undefined ? Math.round(lengthIn * IN_CM) : 0,
    waist: "regular",
      label: widthIn !== undefined ? `${fmtNum(widthIn)}"` : `${fmtNum(lengthIn!)}" long`,
    inStock,
    ...(widthIn !== undefined ? { widthIn } : {}),
    ...(price !== undefined ? { price } : {}),
  };
}

/** Skate size label → BoardSize (width drives fit; length only for cruisers/longboards). */
export const parseSkateSize = (label: string, inStock = true, price?: number) => skateSize(skateDims(label), inStock, price);

/** Surf length in a label/title: 5'10", 5' 10", 5ft10, 7'6, 6', 9'0'' → { feet, inches, cm }. */
export function surfLength(label: string): { feet: number; inches: number; cm: number } | null {
  const m = label.match(/(?<![\d.])(\d{1,2})\s*(?:'(?!')|′|’|ft\.?|feet)\s*(?:(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:"|″|”|''|in\b)?)?/i);
  if (!m) {
    // Total inches: "56''", "56 in" (mini foamies).
    const t = label.match(/(?<![\d.'])(\d{2,3})\s*(?:''|"|″|”|\s*in(?:ch(?:es)?)?\b)/i);
    const total = t ? Number(t[1]) : NaN;
    if (!(total >= 36 && total <= 144)) return null;
    return { feet: Math.floor(total / 12), inches: total % 12, cm: Math.round(total * IN_CM) };
  }
  const feet = Number(m[1]);
  const inches = m[2] ? Number(m[2].replace(",", ".")) : 0;
  if (feet < 3 || feet > 12 || inches >= 12) return null;
  return { feet, inches, cm: Math.round((feet * 12 + inches) * IN_CM) };
}

/** Surf volume: "32.5L", "32.5 L", "32,5 l", "48-liter", "Volume 29.08 liter". */
export function surfVolume(label: string): number | null {
  const m = label.match(/(?<![\d.])(\d{1,3}(?:[.,]\d{1,2})?)\s*-?\s*(?:l|liters?|litres?|ltr)\b/i);
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  return v >= 10 && v <= 150 ? v : null;
}

export function parseSurfSize(label: string, inStock = true, price?: number, volumeL?: number): BoardSize | null {
  const len = surfLength(label);
  const vol = surfVolume(label) ?? volumeL ?? null;
  if (!len) return null;
  return {
    lengthCm: len.cm,
    waist: "regular",
    label: `${len.feet}'${fmtNum(len.inches)}"`,
    inStock,
    ...(vol !== null ? { volumeL: vol } : {}),
    ...(price !== undefined ? { price } : {}),
  };
}

/** Sport-aware size label parser. */
export function parseSizeFor(sport: Sport, label: string, inStock = true, price?: number): BoardSize | null {
  if (sport === "skate") return parseSkateSize(label, inStock, price);
  if (sport === "surf") return parseSurfSize(label, inStock, price);
  return parseSizeLabel(label, inStock, price);
}

/** Size facts a product page states once for the whole product (Blue Tomato feature list, evo copy). */
export interface PageFeatures {
  widthIn?: number;
  lengthIn?: number;
  surfLength?: string;
  volumeL?: number;
}

/** "Width 9.75 inch", "Length (inch) 44 inch", "Length 5'9 ft", "Volume 29.08 liter" / "Volume (liter) 29.08". */
export function pageFeatures(sport: Sport, text: string): PageFeatures {
  const num = (s: string | undefined) => (s ? Number(s.replace(",", ".")) : undefined);
  if (sport === "skate") {
    const w = num(text.match(/(?<!(?:truck|hanger|wheel|axle|wheelbase)\s*)\bwidth\s*(?:\((?:inch|in)\))?\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*(?:inch|in\b|"|″)/i)?.[1]);
    const l = num(text.match(/\blength\s*\((?:inch|in)\)\s*(\d{1,2}(?:[.,]\d{1,2})?)/i)?.[1]);
    return {
      ...(w !== undefined && w >= DECK_WIDTH_IN[0] && w <= DECK_WIDTH_IN[1] ? { widthIn: w } : {}),
      ...(l !== undefined && l >= DECK_LENGTH_IN[0] && l <= DECK_LENGTH_IN[1] ? { lengthIn: l } : {}),
    };
  }
  if (sport === "surf") {
    const len = text.match(/\blength\s*(?:\(ft\))?\s*(\d{1,2}\s*['′’]\s*(?:\d{1,2}(?:[.,]\d{1,2})?)?)/i)?.[1];
    const vol = num(text.match(/\bvolume\s*(?:\((?:liters?|litres?|l)\))?\s*:?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:liters?|litres?|l\b)?/i)?.[1]);
    return {
      ...(len ? { surfLength: len } : {}),
      ...(vol !== undefined && vol >= 10 && vol <= 150 ? { volumeL: vol } : {}),
    };
  }
  return {};
}

export interface RawVariant {
  label: string;
  inStock: boolean;
  price?: number;
}

/**
 * Variants → sizes for any sport. Skate/surf shops often sell one size per product
 * page with an "Uni" / "Default Title" variant: the size then comes from the page
 * features or the title ("… 8.25″ Skateboard Deck", "… 5'10 Surfboard").
 */
export function buildSizes(sport: Sport, variants: RawVariant[], title: string, features: PageFeatures = {}): BoardSize[] {
  const usable = sport === "snow" ? variants : variants.filter((v) => !/\b(b[- ]?grade|blem\w*|used|do not use)\b/i.test(v.label));
  let sizes = mergeSizes(usable.flatMap((v) => parseSizeFor(sport, v.label, v.inStock, v.price) ?? []));
  if (sport === "snow" || !usable.length) return sizes;

  const inStock = usable.some((v) => v.inStock);
  const prices = usable.filter((v) => v.price !== undefined && (v.inStock || !inStock)).map((v) => v.price!);
  const price = prices.length ? Math.min(...prices) : undefined;

  if (sport === "skate") {
    const fromTitle = skateDims(title);
    if (!sizes.length) {
      const s = skateSize({ widthIn: features.widthIn ?? fromTitle.widthIn, lengthIn: features.lengthIn ?? fromTitle.lengthIn }, inStock, price);
      sizes = s ? [s] : [];
    } else if (sizes.length === 1) {
      // One size: complete it with the width / length the page or title states.
      const [s] = sizes;
      const widthIn = s.widthIn ?? features.widthIn ?? fromTitle.widthIn;
      const lengthIn = features.lengthIn ?? fromTitle.lengthIn;
      sizes = [{
        ...s,
        ...(widthIn !== undefined ? { widthIn, label: `${fmtNum(widthIn)}"` } : {}),
        ...(!s.lengthCm && lengthIn !== undefined ? { lengthCm: Math.round(lengthIn * IN_CM) } : {}),
      }];
    }
    return sizes;
  }

  // surf
  if (!sizes.length) {
    const s = parseSurfSize(features.surfLength ?? title, inStock, price, features.volumeL ?? surfVolume(title) ?? undefined);
    sizes = s ? [s] : [];
  } else if (sizes.length === 1 && sizes[0].volumeL === undefined) {
    const vol = features.volumeL ?? surfVolume(title);
    if (vol) sizes = [{ ...sizes[0], volumeL: vol }];
  }
  return sizes;
}
