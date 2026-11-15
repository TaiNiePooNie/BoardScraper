import type { BoardModel, BoardProfile, BoardSize, FitPreference, RiderInput, RiderStyle, RidingStyle, SizeMatch, SkillLevel, Sport } from "./types";

/**
 * Weight → base board length (cm), all-mountain reference.
 * Weight is the PRIMARY metric; height only nudges within ±1 cm.
 * Anchors are linearly interpolated and clamped at the ends.
 */
const WEIGHT_ANCHORS: ReadonlyArray<[kg: number, cm: number]> = [
  // kids
  [15, 90],
  [20, 100],
  [25, 110],
  [30, 119],
  [35, 129],
  // adults
  [40, 138],
  [50, 144],
  [60, 149],
  [70, 154],
  [80, 157],
  [90, 160],
  [100, 163],
  [115, 167],
  [130, 170],
];

/** Wide is strictly required at US 11 / EU 44.5 and up. */
export const WIDE_THRESHOLD_US = 11;
export const WIDE_THRESHOLD_EU = 44.5;

export interface StyleSpec {
  lengthOffsetCm: number;
  flex: [min: number, max: number];
  profiles: BoardProfile[];
}

export const STYLE_SPECS: Record<RidingStyle, StyleSpec> = {
  park: { lengthOffsetCm: -3, flex: [1, 5], profiles: ["hybrid-rocker", "rocker", "flat", "hybrid-camber"] },
  "all-mountain": { lengthOffsetCm: 0, flex: [4, 7], profiles: ["hybrid-camber", "camber", "directional-camber", "hybrid-rocker"] },
  freeride: { lengthOffsetCm: 3, flex: [6, 10], profiles: ["directional-camber", "camber", "hybrid-camber"] },
};

/** Acceptable deviation from the ideal length when matching sizes. */
export const LENGTH_TOLERANCE_CM = 3;

export interface Recommendation {
  idealLengthCm: number;
  lengthRangeCm: [number, number];
  requiresWide: boolean;
  bootSizeUS: number;
  flexRange: [number, number];
  profiles: BoardProfile[];
  notes: string[];
}

export function lengthFromWeight(weightKg: number): number {
  const a = WEIGHT_ANCHORS;
  if (weightKg <= a[0][0]) return a[0][1];
  if (weightKg >= a[a.length - 1][0]) return a[a.length - 1][1];
  for (let i = 1; i < a.length; i++) {
    const [w1, l1] = a[i];
    if (weightKg <= w1) {
      const [w0, l0] = a[i - 1];
      return l0 + ((weightKg - w0) / (w1 - w0)) * (l1 - l0);
    }
  }
  return a[a.length - 1][1];
}

/** Men's US ↔ EU (Mondopoint-ish retail conversion used by most boot brands). */
export function toUSBootSize(size: number, system: "US" | "EU"): number {
  return system === "US" ? size : Math.round((size - 33.5) * 2) / 2;
}

export function requiresWide(bootSize: number, system: "US" | "EU"): boolean {
  return system === "EU" ? bootSize >= WIDE_THRESHOLD_EU : bootSize >= WIDE_THRESHOLD_US;
}

/**
 * Height tie-breaker: tall/light riders get +1 cm (leverage), short/heavy −1 cm.
 * Uses BMI as a crude proxy; never moves more than 1 cm.
 */
function heightNudge(weightKg: number, heightCm: number): number {
  const bmi = weightKg / (heightCm / 100) ** 2;
  if (bmi < 19) return 1;
  if (bmi > 28) return -1;
  return 0;
}

/**
 * Skill shifts length and flex: beginners get a slightly shorter, softer board
 * (easier to turn, more forgiving); experts a longer, stiffer one (stability at speed).
 */
export const SKILL_ADJUST: Record<SkillLevel, { lengthCm: number; flex: number }> = {
  beginner: { lengthCm: -2, flex: -2 },
  intermediate: { lengthCm: 0, flex: 0 },
  advanced: { lengthCm: 1, flex: 1 },
  expert: { lengthCm: 2, flex: 2 },
};

const clampFlex = (n: number) => Math.min(10, Math.max(1, n));

/**
 * Weight shifts flex too: a light rider can't bend a stiff board, a heavy rider
 * overpowers a soft one. Kids' weights land at the soft end.
 */
export function weightFlexShift(weightKg: number): number {
  if (weightKg < 40) return -2;
  if (weightKg < 55) return -1;
  if (weightKg <= 85) return 0;
  if (weightKg <= 100) return 1;
  return 2;
}

/** "All styles": all-mountain length, every flex and profile. */
const ANY_STYLE: StyleSpec = {
  lengthOffsetCm: 0,
  flex: [1, 10],
  profiles: ["hybrid-camber", "camber", "directional-camber", "hybrid-rocker", "rocker", "flat"],
};

export function recommend(input: RiderInput): Recommendation {
  const spec = input.style === "any" ? ANY_STYLE : STYLE_SPECS[input.style];
  const skill = SKILL_ADJUST[input.skill ?? "intermediate"];
  const base = lengthFromWeight(input.weightKg);
  const ideal = Math.round(base + spec.lengthOffsetCm + skill.lengthCm + heightNudge(input.weightKg, input.heightCm));
  const wide = requiresWide(input.bootSize, input.bootSystem);
  const bootUS = toUSBootSize(input.bootSize, input.bootSystem);

  const notes = [`Length from weight (${input.weightKg} kg) → ${Math.round(base)} cm base`];
  if (spec.lengthOffsetCm && input.style !== "any") notes.push(`${input.style}: ${spec.lengthOffsetCm > 0 ? "+" : ""}${spec.lengthOffsetCm} cm`);
  if (skill.lengthCm) notes.push(`${input.skill}: ${skill.lengthCm > 0 ? "+" : ""}${skill.lengthCm} cm, flex ${skill.flex > 0 ? "+" : ""}${skill.flex}`);
  const wFlex = input.style === "any" ? 0 : weightFlexShift(input.weightKg);
  if (wFlex) notes.push(`${input.weightKg} kg: flex ${wFlex > 0 ? "+" : ""}${wFlex}`);
  if (wide) notes.push(`Boot US ${bootUS} ≥ US ${WIDE_THRESHOLD_US}: Wide (W) boards only`);

  return {
    idealLengthCm: ideal,
    lengthRangeCm: [ideal - LENGTH_TOLERANCE_CM, ideal + LENGTH_TOLERANCE_CM],
    requiresWide: wide,
    bootSizeUS: bootUS,
    flexRange: [clampFlex(spec.flex[0] + skill.flex + wFlex), clampFlex(spec.flex[1] + skill.flex + wFlex)],
    profiles: spec.profiles,
    notes,
  };
}

/** Strict size filter: wide rule is non-negotiable, length must be within tolerance. */
export function matchSizes(sizes: BoardSize[], rec: Recommendation): SizeMatch[] {
  return sizes
    .filter((s) => (rec.requiresWide ? s.waist === "wide" : s.waist !== "wide"))
    .map((size) => {
      const deltaCm = Math.abs(size.lengthCm - rec.idealLengthCm);
      return { size, deltaCm, fits: deltaCm <= LENGTH_TOLERANCE_CM };
    })
    .filter((m) => m.fits)
    .sort((a, b) => a.deltaCm - b.deltaCm);
}

/** 0..1 score for how well a board's flex + profile suit the riding style. */
export function styleFit(board: Pick<BoardModel, "flex" | "profile" | "styles">, rec: Recommendation, style: RiderStyle): number {
  if (style === "any") return 1;
  const [lo, hi] = rec.flexRange;
  // Unknown specs score neutral (0.5) rather than penalizing scraped boards with sparse copy.
  const { flex, profile } = board;
  const flexScore = flex === null ? 0.5 : Math.max(0, 1 - (flex < lo ? lo - flex : flex > hi ? flex - hi : 0) / 3);
  const profileIdx = profile === null ? -2 : rec.profiles.indexOf(profile);
  const profileScore = profileIdx === -2 ? 0.5 : profileIdx === -1 ? 0 : 1 - profileIdx * 0.15;
  const tagScore = board.styles.includes(style) ? 1 : 0.4;
  return Math.round((flexScore * 0.4 + profileScore * 0.4 + tagScore * 0.2) * 100) / 100;
}

/** Women's-specific board, detected from the model name (shops tag these consistently in titles). */
export const isWomensBoard = (model: string) => /\b(women'?s?|womens|wmns|ladies|damen|femme|femmes|für frauen|fur frauen|w's)\b/i.test(model);

/** Kids' board, detected from the model name (kids/youth/junior or well-known kids model names). */
export const isKidsBoard = (model: string) => /\b(kids?|youth|junior|jr|boys?|girls?|enfants?|kinder|grom|chopper|riglet|mini)\b/i.test(model);

export function fitAllows(fit: FitPreference | undefined, model: string): boolean {
  if (!fit || fit === "any") return true;
  const kids = isKidsBoard(model);
  if (fit === "kids") return kids;
  if (kids) return false;
  return fit === "womens" ? isWomensBoard(model) : !isWomensBoard(model);
}

/* ───────────────────────── Multi-sport fit ───────────────────────── */

/** One sport's size recommendation, in that sport's natural unit. */
export interface SportFit {
  sport: Sport;
  /** snow: board length cm · skate: deck width in · surf: volume L */
  unit: "cm" | "in" | "L";
  ideal: number;
  range: [number, number];
  /** Short display label, e.g. "156 cm", '8.25"', "34 L". */
  label: string;
  notes: string[];
  /** Snow only: the full snowboard recommendation (wide rule, flex, profiles). */
  snow?: Recommendation;
  /** Surf only: suggested board length range (cm), used when a shop lists no volume. */
  lengthRangeCm?: [number, number];
}

const round = (n: number, step: number) => Math.round(n / step) * step;
export const fmtIn = (n: number) => `${Number(n.toFixed(3))}"`;
export function fmtFeet(cm: number): string {
  const totalIn = Math.round(cm / 2.54);
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
}

/** Skate deck width (in) from US shoe size; style shifts it, kids get narrow decks. */
export function skateFit(input: RiderInput): SportFit {
  const us = toUSBootSize(input.bootSize, input.bootSystem);
  const kids = input.fit === "kids";
  const base = kids ? (us <= 3 ? 7.0 : 7.375) : us <= 6 ? 7.75 : us <= 8.5 ? 7.875 : us <= 10.5 ? 8.125 : us <= 12 ? 8.375 : 8.625;
  const style = input.skateStyle ?? "street";
  const shift = { street: -0.125, park: 0, transition: 0.25, cruise: 0.5, any: 0 }[style];
  const tol = style === "any" ? 0.5 : 0.25;
  const ideal = round(base + shift, 0.125);
  const notes = [`Shoe US ${us} → ${fmtIn(base)} base`];
  if (shift) notes.push(`${style}: ${shift > 0 ? "+" : ""}${shift}"`);
  return { sport: "skate", unit: "in", ideal, range: [ideal - tol, ideal + tol], label: fmtIn(ideal), notes };
}

/** Surf volume from weight × skill factor (the "guild factor"), nudged by wave size; length from height + skill. */
export const SURF_GUILD: Record<SkillLevel, number> = { beginner: 0.7, intermediate: 0.45, advanced: 0.39, expert: 0.36 };
const SURF_LENGTH_ADD_CM: Record<SkillLevel, number> = { beginner: 75, intermediate: 35, advanced: 12, expert: 3 };
export function surfFit(input: RiderInput): SportFit {
  const skill = input.skill ?? "intermediate";
  const waves = input.waves ?? "small";
  const waveMul = { small: 1.08, medium: 1, big: 0.94 }[waves];
  const ideal = Math.round(input.weightKg * SURF_GUILD[skill] * waveMul * 2) / 2;
  const tol = Math.max(2, ideal * 0.1);
  const len = input.heightCm + SURF_LENGTH_ADD_CM[skill] + { small: 8, medium: 0, big: -5 }[waves];
  const notes = [`${input.weightKg} kg × ${SURF_GUILD[skill]} (${skill}) → ${Math.round(input.weightKg * SURF_GUILD[skill])} L`, `${waves} waves: ×${waveMul}`];
  return {
    sport: "surf", unit: "L", ideal, range: [ideal - tol, ideal + tol], label: `${ideal} L`, notes,
    lengthRangeCm: [Math.round(len - 15), Math.round(len + 15)],
  };
}

export function snowFit(input: RiderInput): SportFit {
  const r = recommend(input);
  return { sport: "snow", unit: "cm", ideal: r.idealLengthCm, range: r.lengthRangeCm, label: `${r.idealLengthCm}${r.requiresWide ? "W" : ""} cm`, notes: r.notes, snow: r };
}

export function recommendFor(sport: Sport, input: RiderInput): SportFit {
  return sport === "skate" ? skateFit(input) : sport === "surf" ? surfFit(input) : snowFit(input);
}

/** Sizes of a listing that fit, best first. Skate by width, surf by volume (else length), snow as before. */
export function matchSizesFor(sizes: BoardSize[], fit: SportFit): SizeMatch[] {
  if (fit.sport === "snow" && fit.snow) return matchSizes(sizes, fit.snow);
  const [lo, hi] = fit.range;
  const out: SizeMatch[] = [];
  for (const size of sizes) {
    if (fit.sport === "skate") {
      if (size.widthIn === undefined) continue;
      out.push({ size, deltaCm: Math.abs(size.widthIn - fit.ideal), fits: size.widthIn >= lo - 1e-6 && size.widthIn <= hi + 1e-6 });
    } else if (size.volumeL !== undefined) {
      out.push({ size, deltaCm: Math.abs(size.volumeL - fit.ideal), fits: size.volumeL >= lo && size.volumeL <= hi });
    } else if (fit.lengthRangeCm && size.lengthCm > 0) {
      const [a, b] = fit.lengthRangeCm;
      const mid = (a + b) / 2;
      out.push({ size, deltaCm: Math.abs(size.lengthCm - mid) / 10, fits: size.lengthCm >= a && size.lengthCm <= b });
    }
  }
  return out.filter((m) => m.fits).sort((a, b) => a.deltaCm - b.deltaCm);
}
