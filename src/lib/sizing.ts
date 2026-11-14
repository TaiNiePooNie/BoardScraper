import type { BoardModel, BoardProfile, BoardSize, FitPreference, RiderInput, RiderStyle, RidingStyle, SizeMatch, SkillLevel } from "./types";

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
  if (wide) notes.push(`Boot US ${bootUS} ≥ US ${WIDE_THRESHOLD_US}: Wide (W) boards only`);

  return {
    idealLengthCm: ideal,
    lengthRangeCm: [ideal - LENGTH_TOLERANCE_CM, ideal + LENGTH_TOLERANCE_CM],
    requiresWide: wide,
    bootSizeUS: bootUS,
    flexRange: [clampFlex(spec.flex[0] + skill.flex), clampFlex(spec.flex[1] + skill.flex)],
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
