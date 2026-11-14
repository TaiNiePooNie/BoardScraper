import type { BoardModel, BoardProfile, BoardShape } from "./types";

/**
 * Game-style board stats (1–10), derived from flex, profile and shape so a
 * beginner can compare boards at a glance. Heuristic, not a lab measurement:
 * when flex or profile is unknown the stat is marked `estimated`.
 */
export const STAT_KEYS = ["speed", "pop", "float", "edgeHold", "forgiveness"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type BoardStats = Record<StatKey, number> & { estimated: boolean };

export const STAT_LABELS: Record<StatKey, { label: string; hint: string }> = {
  speed: { label: "Speed", hint: "Stable and fast when you let it run" },
  pop: { label: "Pop", hint: "How springy it is for ollies and jumps" },
  float: { label: "Float", hint: "How well it stays on top of powder" },
  edgeHold: { label: "Edge Hold", hint: "Grip on hard, icy snow" },
  forgiveness: { label: "Forgiveness", hint: "How easy and catch-free it feels" },
};

type Mods = Partial<Record<StatKey, number>>;

const PROFILE: Record<BoardProfile, Mods> = {
  camber: { speed: 2, pop: 2, edgeHold: 3, float: -1, forgiveness: -2 },
  "directional-camber": { speed: 2, pop: 1, edgeHold: 2, float: 2, forgiveness: -1 },
  "hybrid-camber": { speed: 1, pop: 2, edgeHold: 2, float: 1 },
  "hybrid-rocker": { pop: 1, edgeHold: 1, float: 1, forgiveness: 2 },
  rocker: { speed: -1, edgeHold: -1, float: 2, forgiveness: 3 },
  flat: { forgiveness: 2 },
};

const SHAPE: Record<BoardShape, Mods> = {
  tapered: { float: 2, speed: 1 },
  directional: { float: 1, speed: 1 },
  "directional-twin": { float: 0.5 },
  "true-twin": { forgiveness: 0.5, float: -0.5 },
};

const clamp = (n: number) => Math.min(10, Math.max(1, Math.round(n)));

export function boardStats(b: Pick<BoardModel, "flex" | "profile" | "shape">): BoardStats {
  const f = b.flex ?? 5;
  const base: Record<StatKey, number> = {
    speed: 2 + f * 0.6,
    pop: 4 + (f - 5) * 0.3,
    float: 4,
    edgeHold: 1.5 + f * 0.6,
    forgiveness: 9.5 - f * 0.75,
  };
  for (const mods of [b.profile ? PROFILE[b.profile] : {}, b.shape ? SHAPE[b.shape] : {}]) {
    for (const [k, v] of Object.entries(mods) as [StatKey, number][]) base[k] += v;
  }
  return {
    speed: clamp(base.speed),
    pop: clamp(base.pop),
    float: clamp(base.float),
    edgeHold: clamp(base.edgeHold),
    forgiveness: clamp(base.forgiveness),
    estimated: b.flex === null || b.profile === null,
  };
}
