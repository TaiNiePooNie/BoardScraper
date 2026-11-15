import { describe, expect, it } from "vitest";
import { buyOrWait, easter, saleEvents, salesFor } from "./sales";

const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("sale calendar", () => {
  it("computes moving dates", () => {
    expect(iso(easter(2027))).toBe("2027-03-28");
    expect(iso(easter(2026))).toBe("2026-04-05");
    const bf = saleEvents(2026).find((e) => e.id.startsWith("black-friday"))!;
    expect(iso(bf.start)).toBe("2026-11-20"); // Black Friday 27 Nov − 7 days
    expect(iso(bf.end)).toBe("2026-11-30"); // Cyber Monday
  });
  it("finds Black Friday ahead in mid November, by region and sport", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const be = salesFor(now, "BE", "snow");
    expect(be.upcoming[0].name).toBe("Black Friday week");
    expect(be.upcoming[0].inDays).toBe(5);
    expect(salesFor(now, "HK", "skate").active.map((e) => e.name)).toEqual([]);
    expect(salesFor(new Date("2026-12-27T00:00:00Z"), "GB", "surf").active.map((e) => e.name)).toContain("Boxing Day sales");
    expect(salesFor(new Date("2026-12-27T00:00:00Z"), "DE", "surf").active).toHaveLength(0);
  });
  it("advises waiting before a sale and buying during one", () => {
    const before = buyOrWait({ now: new Date("2026-11-15T00:00:00Z"), country: "US", sport: "snow", discountPct: 0.05, lowestIn90: false });
    expect(before?.kind).toBe("wait");
    const during = buyOrWait({ now: new Date("2026-11-27T00:00:00Z"), country: "US", sport: "snow", discountPct: 0.3, lowestIn90: false });
    expect(during?.kind).toBe("buy");
    const great = buyOrWait({ now: new Date("2026-11-15T00:00:00Z"), country: "US", sport: "snow", discountPct: 0.5, lowestIn90: true });
    expect(great?.kind).toBe("buy");
  });
});
