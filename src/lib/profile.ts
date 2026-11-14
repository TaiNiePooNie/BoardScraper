import { Buddy, DEFAULT_ALERTS, type AlertSettings } from "./account";
import type { Budget } from "./offers";
import { RiderInput } from "./types";

/** What the setup flow edits for one rider. */
export interface Profile {
  rider: RiderInput;
  budget: Budget;
}

export type { Buddy };

/** Everything remembered on this device (and synced to the account when signed in). */
export interface Store {
  buddies: Buddy[];
  /** Buddy id, or BROWSE_ID for unfiltered browsing. */
  activeId: string;
  holds: string[];
  alerts: AlertSettings;
}

export const BROWSE_ID = "browse";

export const DEFAULT_PROFILE: Profile = {
  rider: { weightKg: 75, heightCm: 178, bootSize: 10, bootSystem: "US", style: "all-mountain", skill: "intermediate", fit: "any" },
  budget: { min: null, max: 600 },
};

const KEY = "boardbuddy.store.v2";
const LEGACY_PROFILE = "boardbuddy.profile.v1";
const LEGACY_HOLDS = "boardbuddy.holds.v1";

export const newBuddyId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function makeBuddy(name: string, avatar: number, p: Profile): Buddy {
  return { id: newBuddyId(), name, avatar, rider: p.rider, budget: p.budget };
}

/** Load the device store; migrates the single v1 profile into a "Me" buddy. */
export function loadStore(): Store | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      const buddies = (s.buddies ?? []).flatMap((b) => {
        const ok = Buddy.safeParse(b);
        return ok.success ? [ok.data] : [];
      });
      if (!buddies.length) return null;
      const activeId = s.activeId === BROWSE_ID || buddies.some((b) => b.id === s.activeId) ? s.activeId : buddies[0].id;
      return { buddies, activeId, holds: Array.isArray(s.holds) ? s.holds : [], alerts: { ...DEFAULT_ALERTS, ...(s.alerts ?? {}) } };
    }
    const legacy = localStorage.getItem(LEGACY_PROFILE);
    if (legacy) {
      const p = JSON.parse(legacy) as Profile;
      const rider = RiderInput.safeParse(p.rider);
      if (rider.success) {
        const me: Buddy = { id: "me", name: "Me", avatar: 8, rider: rider.data, budget: { min: p.budget?.min ?? null, max: p.budget?.max ?? null } };
        const holds = JSON.parse(localStorage.getItem(LEGACY_HOLDS) ?? "[]");
        return { buddies: [me], activeId: me.id, holds, alerts: DEFAULT_ALERTS };
      }
    }
  } catch {
    /* storage blocked or corrupt */
  }
  return null;
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: lives for this visit only */
  }
}
