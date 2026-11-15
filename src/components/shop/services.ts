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
  /** "just now", "3 min ago" */
  checkedAgo?: string;
  message: string;
}

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: boolean;
  /** Site owner: sees owner-only tools like Restock. */
  isOwner?: boolean;
}

export interface Providers {
  google: boolean;
  apple: boolean;
  /** passwordless sign-in links */
  email: boolean;
  /** email + password accounts */
  password: boolean;
  /** "forgot password" emails */
  passwordReset: boolean;
}

export interface AccountServices {
  config: () => Promise<{ enabled: boolean; providers: Providers }>;
  /** Signed-in user + their saved data (null data = nothing saved yet), or null when signed out. */
  me: () => Promise<{ user: AccountUser; data: MePayload | null } | null>;
  save: (data: MePayload) => Promise<void>;
  signInSocial: (provider: "google" | "apple") => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/** What the shop can do in this environment. The static test build only has loadDeals. */
export interface ShopServices {
  account?: AccountServices;
  loadDeals: DealsLoader;
  restock?: {
    /** passcode only needed when not signed in as an owner */
    start: (passcode?: string) => Promise<RestockStatus>;
    status: () => Promise<RestockStatus>;
  };
  liveCheck?: (listingId: string) => Promise<LiveResult>;
}

const callback = () => `${location.pathname}?signedin=1`;

/** Better Auth error → short, human message. */
function friendly(e: { code?: string; message?: string; status?: number }): string {
  const code = e.code ?? "";
  if (code.includes("USER_ALREADY_EXISTS")) return "There's already an account with this email. Sign in instead.";
  if (code.includes("INVALID_EMAIL_OR_PASSWORD") || e.status === 401) return "Email or password doesn't match.";
  if (code.includes("PASSWORD_TOO_SHORT")) return "Use at least 8 characters for your password.";
  if (code.includes("INVALID_EMAIL")) return "That doesn't look like an email address.";
  if (e.status === 429) return "Too many tries. Wait a minute and try again.";
  return e.message ?? "Something went wrong. Try again.";
}

const accountServices: AccountServices = {
  async config() {
    const r = await fetch("/api/account-config", { cache: "no-store" });
    return r.ok ? r.json() : { enabled: false, providers: { google: false, apple: false, email: false, password: false, passwordReset: false } };
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
  async signUpEmail(email, password, name) {
    const { authClient } = await import("@/lib/auth-client");
    const r = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
    if (r.error) throw new Error(friendly(r.error));
  },
  async signInEmail(email, password) {
    const { authClient } = await import("@/lib/auth-client");
    const r = await authClient.signIn.email({ email, password });
    if (r.error) throw new Error(friendly(r.error));
  },
  async requestPasswordReset(email) {
    const { authClient } = await import("@/lib/auth-client");
    const r = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    if (r.error) throw new Error(friendly(r.error));
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
      const res = await fetch("/api/restock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(passcode ? { passcode } : {}) });
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
