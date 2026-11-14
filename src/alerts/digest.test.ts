import { describe, expect, it } from "vitest";
import { buildMockCatalog } from "@/lib/data/mock";
import { dealsDigestEmail } from "@/lib/email/templates";
import type { Buddy } from "@/lib/profile";
import { buildDigest, isDue } from "./digest";

const catalog = buildMockCatalog();
const me: Buddy = {
  id: "me", name: "Me", avatar: 8,
  rider: { weightKg: 75, heightCm: 178, bootSize: 9, bootSystem: "US", style: "all-mountain", fit: "any" },
  budget: { min: null, max: null },
};
const base = { catalog, locale: { country: "DE", currency: "EUR" as const, source: "override" as const }, buddies: [me], holds: [], priceDrops: false, appUrl: "https://bb.test" };

describe("deal alert digest", () => {
  it("weekly roundup lists good deals that fit, with links", () => {
    const d = buildDigest({ ...base, mode: "weekly", log: new Map() });
    expect(d.count).toBeGreaterThan(0);
    expect(d.count).toBeLessThanOrEqual(5);
    expect(d.sections[0].boards[0].boardUrl).toMatch(/^https:\/\/bb\.test\/\?board=/);
    expect(d.record.length).toBe(d.count);
  });

  it("new-match mode skips boards already emailed at the same price", () => {
    const first = buildDigest({ ...base, mode: "new-match", log: new Map() });
    const log = new Map(first.record.map((r) => [r.boardId, { price: r.price, currency: r.currency }]));
    const again = buildDigest({ ...base, mode: "new-match", log });
    const firstIds = new Set(first.record.map((r) => r.boardId));
    expect(again.record.every((r) => !firstIds.has(r.boardId))).toBe(true);
  });

  it("held boards: first run records a baseline, a later ≥3% drop is reported", () => {
    const anyGroup = buildDigest({ ...base, mode: "weekly", log: new Map() }).record[0];
    const held = { ...base, holds: [anyGroup.boardId], priceDrops: true, buddies: [] };
    const baseline = buildDigest({ ...held, mode: "weekly", log: new Map() });
    expect(baseline.count).toBe(0);
    expect(baseline.record.map((r) => r.boardId)).toContain(anyGroup.boardId);
    const log = new Map([[anyGroup.boardId, { price: anyGroup.price * 1.2, currency: anyGroup.currency }]]);
    const dropped = buildDigest({ ...held, mode: "weekly", log });
    expect(dropped.sections[0].title).toBe("Price drops on your holds");
  });

  it("due rules", () => {
    const fri = new Date("2026-11-13T07:00:00Z"); // Friday
    expect(isDue("weekly", 5, null, fri)).toBe(true);
    expect(isDue("weekly", 1, null, fri)).toBe(false);
    expect(isDue("weekly", 5, new Date("2026-11-13T05:00:00Z"), fri)).toBe(false);
    expect(isDue("new-match", 0, new Date("2026-11-12T05:00:00Z"), fri)).toBe(true);
    expect(isDue("new-match", 0, new Date("2026-11-13T01:00:00Z"), fri)).toBe(false);
  });

  it("email has unsubscribe + manage links and escapes text", () => {
    const d = buildDigest({ ...base, mode: "weekly", log: new Map() });
    const m = dealsDigestEmail({ name: "<Sam>", sections: d.sections, unsubscribeUrl: "https://bb.test/api/unsubscribe?t=x", manageUrl: "https://bb.test/?profile=1", intro: "Hi" });
    expect(m.html).toContain("https://bb.test/api/unsubscribe?t=x");
    expect(m.html).toContain("&lt;Sam&gt;");
    expect(m.text).toContain("Unsubscribe:");
  });
});
