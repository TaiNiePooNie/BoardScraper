/**
 * Feedback & support against in-memory Postgres: send → chunked attachment upload →
 * owner notification email → guards (token, limits, rate limit, honeypot).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "pglite:memory";
process.env.BETTER_AUTH_SECRET = "test-secret-0123456789abcdef0123456789abcdef";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.RESEND_API_KEY = "re_test";
process.env.EMAIL_FROM = "BoardBuddy <hi@test.dev>";
process.env.OWNER_EMAILS = "owner@test.dev";

const BASE = "http://localhost:3000";
const realFetch = globalThis.fetch;
const sent: { to: string[]; subject: string; reply_to?: string }[] = [];

const json = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1", ...headers }, body: JSON.stringify(body) });
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

describe("feedback", () => {
  beforeAll(async () => {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://api.resend.com")) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response("{}", { status: 200 });
      }
      return realFetch(input, init);
    });
    const { serverDb } = await import("@/db/server");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(serverDb() as never, { migrationsFolder: "drizzle" });
  });
  afterAll(() => vi.unstubAllGlobals());

  it("stores a message, uploads a 2-chunk video and emails the owner", async () => {
    const { POST } = await import("./feedback/route");
    const res = await POST(json("/api/feedback", { kind: "bug", subject: "Surf tab empty", message: "The surf tab shows nothing on my phone.", email: "rider@test.dev", context: { sport: "surf" } }));
    expect(res.status).toBe(200);
    const { id, token } = await res.json();
    expect(id).toBeGreaterThan(0);

    const media = await import("./feedback/[id]/media/route");
    const { FEEDBACK_LIMITS } = await import("@/lib/feedback");
    const size = FEEDBACK_LIMITS.chunkBytes + 1000;
    const announce = await media.POST(json(`/api/feedback/${id}/media`, { filename: "clip.mp4", mime: "video/mp4", size }, { "x-upload-token": token }), ctx({ id: String(id) }));
    expect(announce.status).toBe(200);
    const { mediaId, chunks } = await announce.json();
    expect(chunks).toBe(2);

    const chunk = await import("./feedback/media/[mediaId]/[idx]/route");
    const bytes = new Uint8Array(size).map((_, i) => i % 251);
    for (let i = 0; i < chunks; i++) {
      const part = bytes.slice(i * FEEDBACK_LIMITS.chunkBytes, (i + 1) * FEEDBACK_LIMITS.chunkBytes);
      const r = await chunk.PUT(new Request(`${BASE}/x`, { method: "PUT", headers: { "x-upload-token": token }, body: part }), ctx({ mediaId: String(mediaId), idx: String(i) }));
      expect(r.status).toBe(200);
    }
    // Wrong token is refused.
    const bad = await chunk.PUT(new Request(`${BASE}/x`, { method: "PUT", headers: { "x-upload-token": "nope" }, body: bytes.slice(0, 10) }), ctx({ mediaId: String(mediaId), idx: "0" }));
    expect(bad.status).toBe(403);

    // Stored bytes reassemble exactly.
    const { serverDb } = await import("@/db/server");
    const { feedbackMediaChunks } = await import("@/db/schema");
    const { eq, asc } = await import("drizzle-orm");
    const parts = await serverDb().select().from(feedbackMediaChunks).where(eq(feedbackMediaChunks.mediaId, mediaId)).orderBy(asc(feedbackMediaChunks.idx));
    expect(Buffer.concat(parts.map((p) => p.data)).equals(Buffer.from(bytes))).toBe(true);

    const done = await import("./feedback/[id]/done/route");
    const d = await done.POST(new Request(`${BASE}/x`, { method: "POST", headers: { "x-upload-token": token } }), ctx({ id: String(id) }));
    expect((await d.json()).emailed).toBe(true);
    expect(sent.at(-1)?.to).toEqual(["owner@test.dev"]);
    expect(sent.at(-1)?.subject).toContain("Bug report: Surf tab empty");
    expect(sent.at(-1)?.reply_to).toBe("rider@test.dev");
  });

  it("rejects bad input, oversized files and too many messages; ignores bots", async () => {
    const { POST } = await import("./feedback/route");
    expect((await POST(json("/api/feedback", { kind: "bug", subject: "x", message: "short" }))).status).toBe(400);
    const bot = await POST(json("/api/feedback", { kind: "other", subject: "Buy cheap", message: "spam spam spam spam", website: "http://spam" }));
    expect((await bot.json()).id).toBe(0);

    const ok = await (await POST(json("/api/feedback", { kind: "feature", subject: "Compare boards", message: "Let me compare two boards." }, { "x-forwarded-for": "10.0.0.2" }))).json();
    const media = await import("./feedback/[id]/media/route");
    const big = await media.POST(json(`/api/feedback/${ok.id}/media`, { filename: "huge.mov", mime: "video/quicktime", size: 200 * 1024 * 1024 }, { "x-upload-token": ok.token }), ctx({ id: String(ok.id) }));
    expect(big.status).toBe(413);
    const exe = await media.POST(json(`/api/feedback/${ok.id}/media`, { filename: "a.exe", mime: "application/x-msdownload", size: 10 }, { "x-upload-token": ok.token }), ctx({ id: String(ok.id) }));
    expect(exe.status).toBe(400);

    let last = 200;
    for (let i = 0; i < 10; i++) last = (await POST(json("/api/feedback", { kind: "feedback", subject: `Msg ${i}`, message: "Nice app, keep going!" }, { "x-forwarded-for": "10.0.0.3" }))).status;
    expect(last).toBe(429);
  });

  it("inbox is owner-only", async () => {
    const { GET } = await import("./feedback/route");
    expect((await GET(new Request(`${BASE}/api/feedback`))).status).toBe(403);
    const m = await import("./feedback/media/[mediaId]/route");
    expect((await m.GET(new Request(`${BASE}/x`), ctx({ mediaId: "1" }))).status).toBe(403);
  });
});
