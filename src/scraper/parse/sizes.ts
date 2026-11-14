import type { BoardSize } from "@/lib/types";

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
  return [...by.values()].sort((a, b) => a.lengthCm - b.lengthCm || a.label.localeCompare(b.label));
}

/** Lowest in-stock price, falling back to lowest overall. */
export function headlinePrice(sizes: BoardSize[], fallback: number[]): number | null {
  const inStock = sizes.filter((s) => s.inStock && s.price !== undefined).map((s) => s.price!);
  const all = sizes.filter((s) => s.price !== undefined).map((s) => s.price!).concat(fallback);
  const pool = inStock.length ? inStock : all;
  return pool.length ? Math.min(...pool) : null;
}
