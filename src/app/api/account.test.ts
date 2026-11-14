/**
 * End-to-end account flow against in-memory Postgres (PGlite):
 * magic-link sign-in → session cookie → /api/me save & load → unsubscribe → delete account.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "pglite:memory";
process.env.BETTER_AUTH_SECRET = "test-secret-0123456789abcdef0123456789abcdef";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.RESEND_API_KEY = "re_test";
process.env.EMAIL_FROM = "BoardBuddy <deals@test.dev>";

const BASE = "http://localhost:3000";
let sentLink = "";
const realFetch = globalThis.fetch;

describe("accounts", () => {
  let cookie = "";

  beforeAll(async () => {
    // Capture outgoing emails instead of calling Resend.
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://api.resend.com")) {
        const body = JSON.parse(String(init?.body));
        sentLink = body.text.match(/https?:\/\/\S+/)?.[0] ?? "";
        return new Response(JSON.stringify({ id: "x" }), { status: 200 });
      }
      return realFetch(input, init);
    });
    const { serverDb } = await import("@/db/server");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(serverDb() as never, { migrationsFolder: "drizzle" });
  });
  afterAll(() => vi.unstubAllGlobals());

  const auth = async () => (await import("@/lib/auth")).getAuth();
  const req = (path: string, init: RequestInit = {}) =>
    new Request(`${BASE}${path}`, { ...init, headers: { origin: BASE, "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) } });

  it("sends a magic link and signs in with it", async () => {
    const a = await auth();
    const res = await a.handler(req("/api/auth/sign-in/magic-link", { method: "POST", body: JSON.stringify({ email: "rider@test.dev", callbackURL: "/" }) }));
    expect(res.status).toBe(200);
    expect(sentLink).toContain("/api/auth/magic-link/verify");
    const verify = await a.handler(new Request(sentLink.replace(/^https?:\/\/[^/]+/, BASE)));
    const setCookie = verify.headers.getSetCookie?.() ?? [verify.headers.get("set-cookie") ?? ""];
    cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    expect(cookie).toContain("session_token");
  });

  it("saves and loads riders, holds and alert settings", async () => {
    const me = await import("./me/route");
    const payload = {
      buddies: [{ id: "me", name: "Robin", avatar: 3, rider: { weightKg: 78, heightCm: 180, bootSize: 10, bootSystem: "US", style: "freeride", skill: "advanced", fit: "mens" }, budget: { min: null, max: 500 } }],
      activeId: "me",
      holds: ["12"],
      alerts: { enabled: true, mode: "weekly", weekday: 5, priceDrops: true, buddyIds: [] },
      country: "NL",
      currency: "EUR",
    };
    expect((await me.PUT(req("/api/me", { method: "PUT", body: JSON.stringify(payload) }))).status).toBe(200);
    const got = await (await me.GET(req("/api/me"))).json();
    expect(got.user.email).toBe("rider@test.dev");
    expect(got.data.buddies[0].name).toBe("Robin");
    expect(got.data.holds).toEqual(["12"]);
    expect(got.data.alerts.enabled).toBe(true);
  });

  it("one-click unsubscribe turns alerts off", async () => {
    const { serverDb } = await import("@/db/server");
    const { alertPrefs } = await import("@/db/schema");
    const [p] = await serverDb().select().from(alertPrefs);
    const unsub = await import("./unsubscribe/route");
    const { NextRequest } = await import("next/server");
    const res = await unsub.POST(new NextRequest(`${BASE}/api/unsubscribe?t=${p.unsubscribeToken}`, { method: "POST" }));
    expect(res.status).toBe(200);
    const [after] = await serverDb().select().from(alertPrefs);
    expect(after.enabled).toBe(false);
  });

  it("email + password: sign up, wrong password is refused, sign in, reset email", async () => {
    const a = await auth();
    const signUp = await a.handler(new Request(`${BASE}/api/auth/sign-up/email`, {
      method: "POST", headers: { origin: BASE, "content-type": "application/json" },
      body: JSON.stringify({ email: "pw@test.dev", password: "correct horse", name: "Pat" }),
    }));
    expect(signUp.status).toBe(200);
    expect(sentLink).toContain("/api/auth/verify-email"); // confirmation email sent on sign-up

    const wrong = await a.handler(new Request(`${BASE}/api/auth/sign-in/email`, {
      method: "POST", headers: { origin: BASE, "content-type": "application/json" },
      body: JSON.stringify({ email: "pw@test.dev", password: "nope nope" }),
    }));
    expect(wrong.status).toBe(401);

    const ok = await a.handler(new Request(`${BASE}/api/auth/sign-in/email`, {
      method: "POST", headers: { origin: BASE, "content-type": "application/json" },
      body: JSON.stringify({ email: "pw@test.dev", password: "correct horse" }),
    }));
    expect(ok.status).toBe(200);
    expect((ok.headers.getSetCookie?.() ?? []).join(";")).toContain("session_token");

    sentLink = "";
    const reset = await a.handler(new Request(`${BASE}/api/auth/request-password-reset`, {
      method: "POST", headers: { origin: BASE, "content-type": "application/json" },
      body: JSON.stringify({ email: "pw@test.dev", redirectTo: "/reset-password" }),
    }));
    expect(reset.status).toBe(200);
    expect(sentLink).toContain("/api/auth/reset-password/");
  });

  it("deletes the account and everything attached", async () => {
    const a = await auth();
    const res = await a.handler(req("/api/auth/delete-user", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(200);
    const { serverDb } = await import("@/db/server");
    const s = await import("@/db/schema");
    const users = await serverDb().select().from(s.user);
    expect(users.map((u) => u.email)).not.toContain("rider@test.dev");
    expect(await serverDb().select().from(s.userData)).toHaveLength(0);
    expect(await serverDb().select().from(s.alertPrefs)).toHaveLength(0);
  });
});
