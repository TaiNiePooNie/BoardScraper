import type { MePayload } from "@/lib/account";
import { fromParts, type CatalogPart } from "@/lib/catalog-wire";
import type { Catalog } from "@/lib/data/repository";
import { buildDeals, type DealsResult } from "@/lib/deals";
import type { FeedbackInput } from "@/lib/feedback";
import { SPORTS, type CurrencyCode, type RiderInput, type Sport } from "@/lib/types";

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

export interface FeedbackItem {
  id: number;
  kind: FeedbackInput["kind"];
  subject: string;
  message: string;
  email: string | null;
  context: Record<string, unknown> | null;
  status: "new" | "read" | "done";
  createdAt: string;
  media: { id: number; filename: string; mime: string; size: number }[];
}

export interface FeedbackServices {
  /** Sends the message, then uploads each file in chunks; onProgress gets 0..1. */
  send: (input: FeedbackInput, files: File[], onProgress: (p: number) => void) => Promise<{ failedFiles: string[] }>;
  inbox: {
    list: () => Promise<FeedbackItem[]>;
    setStatus: (id: number, status: FeedbackItem["status"]) => Promise<void>;
    remove: (id: number) => Promise<void>;
    mediaUrl: (mediaId: number) => string;
  };
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
  feedback?: FeedbackServices;
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

/**
 * The catalogue feed is country-independent and CDN-cached; deals (delivered price,
 * grade, fit) are computed here in the browser. Kept in memory for a few minutes so
 * switching country or currency doesn't download it again.
 */
const CATALOG_TTL_MS = 5 * 60_000;
let catalogCache: { at: number; data: Promise<{ catalog: Catalog; source: "db" | "mock" }> } | null = null;

async function fetchPart(sport: Sport, part: number): Promise<CatalogPart> {
  // `v` skips the CDN copy after a live check changed a price.
  const res = await fetch(`/api/catalog?sport=${sport}&part=${part}${bust ? `&v=${bust}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function loadCatalog() {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.data;
  const data = (async () => {
    const perSport = await Promise.all(SPORTS.map(async (sport) => {
      const first = await fetchPart(sport, 0);
      const rest = await Promise.all(Array.from({ length: first.parts - 1 }, (_, i) => fetchPart(sport, i + 1)));
      return [first, ...rest];
    }));
    const parts = perSport.flat();
    return { catalog: fromParts(parts), source: parts[0]?.source ?? "db" };
  })();
  data.catch(() => (catalogCache = null));
  catalogCache = { at: Date.now(), data };
  return data;
}
/** After a live price check changed something: next load re-downloads. */
let bust = 0;
export const invalidateCatalog = () => { catalogCache = null; bust = Date.now(); };

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

const feedbackServices: FeedbackServices = {
  async send(input, files, onProgress) {
    const { id, token } = await jsonOrThrow(await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
    if (!id) return { failedFiles: [] };
    const headers = { "x-upload-token": token };
    const total = files.reduce((n, f) => n + f.size, 0) || 1;
    let sent = 0;
    const failedFiles: string[] = [];
    for (const f of files) {
      try {
        const { mediaId, chunks, chunkBytes } = await jsonOrThrow(await fetch(`/api/feedback/${id}/media`, {
          method: "POST", headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ filename: f.name || "attachment", mime: f.type, size: f.size }),
        }));
        for (let i = 0; i < chunks; i++) {
          const part = f.slice(i * chunkBytes, Math.min(f.size, (i + 1) * chunkBytes));
          await jsonOrThrow(await fetch(`/api/feedback/media/${mediaId}/${i}`, { method: "PUT", headers: { ...headers, "content-type": "application/octet-stream" }, body: part }));
          sent += part.size;
          onProgress(sent / total);
        }
      } catch {
        failedFiles.push(f.name);
      }
    }
    await fetch(`/api/feedback/${id}/done`, { method: "POST", headers }).catch(() => {});
    onProgress(1);
    return { failedFiles };
  },
  inbox: {
    list: async () => (await jsonOrThrow(await fetch("/api/feedback", { cache: "no-store" }))).items,
    setStatus: async (id, status) => { await jsonOrThrow(await fetch(`/api/feedback/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) })); },
    remove: async (id) => { await jsonOrThrow(await fetch(`/api/feedback/${id}`, { method: "DELETE" })); },
    mediaUrl: (mediaId) => `/api/feedback/media/${mediaId}`,
  },
};

export const apiServices: ShopServices = {
  feedback: feedbackServices,
  account: accountServices,
  async loadDeals({ country, currency, rider }) {
    const { catalog, source } = await loadCatalog();
    const result = buildDeals(catalog, { country, currency, source: "override" }, rider);
    const updatedAt = catalog.listings.reduce<string | null>((m, l) => (!m || l.lastScrapedAt > m ? l.lastScrapedAt : m), null);
    return { ...result, source, updatedAt };
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
    if (body.changed) invalidateCatalog();
    return body;
  },
};
