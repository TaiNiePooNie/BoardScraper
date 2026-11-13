import type { BoardModel, BoardProfile, BoardSize, RiderInput, RidingStyle, SizeMatch } from "./types";

/**
 * Weight → base board length (cm), all-mountain reference.
 * Weight is the PRIMARY metric; height only nudges within ±1 cm.
 * Anchors are linearly interpolated and clamped at the ends.
 */
const WEIGHT_ANCHORS: ReadonlyArray<[kg: number, cm: number]> = [
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

export function recommend(input: RiderInput): Recommendation {
  const spec = STYLE_SPECS[input.style];
  const base = lengthFromWeight(input.weightKg);
  const ideal = Math.round(base + spec.lengthOffsetCm + heightNudge(input.weightKg, input.heightCm));
  const wide = requiresWide(input.bootSize, input.bootSystem);
  const bootUS = toUSBootSize(input.bootSize, input.bootSystem);

  const notes = [`Length from weight (${input.weightKg} kg) → ${Math.round(base)} cm base`];
  if (spec.lengthOffsetCm) notes.push(`${input.style}: ${spec.lengthOffsetCm > 0 ? "+" : ""}${spec.lengthOffsetCm} cm`);
  if (wide) notes.push(`Boot US ${bootUS} ≥ US ${WIDE_THRESHOLD_US}: Wide (W) boards only`);

  return {
    idealLengthCm: ideal,
    lengthRangeCm: [ideal - LENGTH_TOLERANCE_CM, ideal + LENGTH_TOLERANCE_CM],
    requiresWide: wide,
    bootSizeUS: bootUS,
    flexRange: spec.flex,
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
export function styleFit(board: Pick<BoardModel, "flex" | "profile" | "styles">, rec: Recommendation, style: RidingStyle): number {
  const [lo, hi] = rec.flexRange;
  const flexDist = board.flex < lo ? lo - board.flex : board.flex > hi ? board.flex - hi : 0;
  const flexScore = Math.max(0, 1 - flexDist / 3);
  const profileIdx = rec.profiles.indexOf(board.profile);
  const profileScore = profileIdx === -1 ? 0 : 1 - profileIdx * 0.15;
  const tagScore = board.styles.includes(style) ? 1 : 0.4;
  return Math.round((flexScore * 0.4 + profileScore * 0.4 + tagScore * 0.2) * 100) / 100;
}
