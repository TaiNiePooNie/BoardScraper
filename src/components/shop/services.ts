import type { MePayload } from "@/lib/account";
import type { DealsResult } from "@/lib/deals";
import type { CurrencyCode, RiderInput } from "@/lib/types";

export type DealsLoader = (q: { country: string; currency: CurrencyCode; rider: RiderInput | null }) => Promise<DealsResult>;

export interface RestockStatus {
  state: "idle" | "queued" | "in_progress" | "completed";
  conclusion?: string | null;
  url?: string;
  startedAt?: string;
}

export interface LiveResult {
  ok: boolean;
  changed: boolean;
  price?: number;
  currency?: CurrencyCode;
  inStock?: boolean;
  message: string;
}

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface AccountServices {
  config: () => Promise<{ enabled: boolean; providers: { google: boolean; apple: boolean; email: boolean } }>;
  /** Signed-in user + their saved data (null data = nothing saved yet), or null when signed out. */
  me: () => Promise<{ user: AccountUser; data: MePayload | null } | null>;
  save: (data: MePayload) => Promise<void>;
  signInSocial: (provider: "google" | "apple") => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/** What the shop can do in this environment. The static test build only has loadDeals. */
export interface ShopServices {
  account?: AccountServices;
  loadDeals: DealsLoader;
  restock?: {
    start: (passcode: string) => Promise<RestockStatus>;
    status: () => Promise<RestockStatus>;
  };
  liveCheck?: (listingId: string) => Promise<LiveResult>;
}

const callback = () => `${location.pathname}?signedin=1`;

const accountServices: AccountServices = {
  async config() {
    const r = await fetch("/api/account-config", { cache: "no-store" });
    return r.ok ? r.json() : { enabled: false, providers: { google: false, apple: false, email: false } };
  },
  async me() {
    const r = await fetch("/api/me", { cache: "no-store" });
    if (r.status === 401 || r.status === 503) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async save(data) {
    const r = await fetch("/api/me", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  async signInSocial(provider) {
    const { authClient } = await import("@/lib/auth-client");
    await authClient.signIn.social({ provider, callbackURL: callback() });
  },
  async sendMagicLink(email) {
    const { authClient } = await import("@/lib/auth-client");
    const r = await authClient.signIn.magicLink({ email, callbackURL: callback() });
    if (r.error) throw new Error(r.error.message ?? "Couldn't send the link.");
  },
  async signOut() {
    const { authClient } = await import("@/lib/auth-client");
    await authClient.signOut();
  },
  async deleteAccount() {
    const { authClient } = await import("@/lib/auth-client");
    const r = await authClient.deleteUser();
    if (r.error) throw new Error(r.error.message ?? "Couldn't delete the account.");
  },
};

export const apiServices: ShopServices = {
  account: accountServices,
  async loadDeals({ country, currency, rider }) {
    const q = new URLSearchParams({ country, currency });
    if (rider) Object.entries(rider).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    const res = await fetch(`/api/deals?${q}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  restock: {
    async start(passcode) {
      const res = await fetch("/api/restock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      return body;
    },
    async status() {
      const res = await fetch("/api/restock", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  },
  async liveCheck(listingId) {
    const res = await fetch(`/api/live/${encodeURIComponent(listingId)}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, changed: false, message: body.error ?? "Couldn't check the shop right now." };
    return body;
  },
};
