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

/** What the shop can do in this environment. The static test build only has loadDeals. */
export interface ShopServices {
  loadDeals: DealsLoader;
  restock?: {
    start: (passcode: string) => Promise<RestockStatus>;
    status: () => Promise<RestockStatus>;
  };
  liveCheck?: (listingId: string) => Promise<LiveResult>;
}

export const apiServices: ShopServices = {
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
