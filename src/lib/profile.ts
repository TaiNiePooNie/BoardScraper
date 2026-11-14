import type { Budget } from "./offers";
import { RiderInput } from "./types";

/** Everything the rider sets up once; remembered on this device. */
export interface Profile {
  rider: RiderInput;
  budget: Budget;
}

export const DEFAULT_PROFILE: Profile = {
  rider: { weightKg: 75, heightCm: 178, bootSize: 10, bootSystem: "US", style: "all-mountain", skill: "intermediate", fit: "any" },
  budget: { min: null, max: 600 },
};

const KEY = "boardbuddy.profile.v1";
const HOLDS = "boardbuddy.holds.v1";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    const rider = RiderInput.safeParse(p.rider);
    return rider.success ? { rider: rider.data, budget: { min: p.budget?.min ?? null, max: p.budget?.max ?? null } } : null;
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: profile lives for this visit only */
  }
}

/** "Hold this board" watchlist (board ids). */
export function loadHolds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HOLDS) ?? "[]");
  } catch {
    return [];
  }
}
export function saveHolds(ids: string[]) {
  try {
    localStorage.setItem(HOLDS, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
