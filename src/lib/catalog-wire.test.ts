import { describe, expect, it } from "vitest";
import { fromParts, PART_SIZE, sellable, toPart } from "./catalog-wire";
import { buildMockCatalog } from "./data/mock";
import { buildDeals } from "./deals";
import { computeStats, densify } from "./grading";

const now = Date.now();
const fresh = () => {
  const c = buildMockCatalog();
  // The feed keeps the last 40 price changes; keep the mock within that so both paths see the same history.
  return { ...c, listings: c.listings.map((l) => ({ ...l, history: l.history.slice(-30), lastScrapedAt: new Date(now).toISOString() })) };
};

describe("catalogue feed", () => {
  it("round-trips sizes, prices and history; deals match the direct computation", () => {
    const cat = fresh();
    const snow = { ...cat, boards: cat.boards.filter((b) => b.sport === "snow"), listings: cat.listings.filter((l) => cat.boards.find((b) => b.id === l.boardId)?.sport === "snow") };
    const part = toPart(snow, "snow", 0, "mock", now);
    expect(part.parts).toBe(1);
    const back = fromParts([JSON.parse(JSON.stringify(part))]);
    const want = sellable(snow.listings, now);
    expect(back.listings).toHaveLength(want.length);
    const a = back.listings.find((l) => l.id === want[0].id)!;
    expect(a.sizes).toEqual(want[0].sizes);
    expect(a.price).toEqual(want[0].price);
    const locale = { country: "DE", currency: "EUR" as const, source: "default" as const };
    const direct = buildDeals({ ...snow, listings: want }, locale, null).deals.map((d) => [d.listing.id, d.landed.total, d.grade.score]).sort();
    const viaFeed = buildDeals(back, locale, null).deals.map((d) => [d.listing.id, d.landed.total, d.grade.score]).sort();
    expect(viaFeed).toEqual(direct);
  });

  it("drops sold-out and stale listings and splits into parts", () => {
    const cat = fresh();
    const l = cat.listings[0];
    const soldOut = { ...l, id: "so", sizes: l.sizes.map((z) => ({ ...z, inStock: false })) };
    const stale = { ...l, id: "st", lastScrapedAt: new Date(now - 30 * 86_400_000).toISOString() };
    expect(sellable([l, soldOut, stale], now).map((x) => x.id)).toEqual([l.id]);
    const many = { ...cat, listings: Array.from({ length: PART_SIZE + 5 }, (_, i) => ({ ...l, id: `x${String(i).padStart(6, "0")}` })) };
    const p0 = toPart(many, "snow", 0, "mock", now);
    const p1 = toPart(many, "snow", 1, "mock", now);
    expect([p0.parts, p0.listings.length, p1.listings.length, !!p0.retailers, !!p1.retailers]).toEqual([2, PART_SIZE, 5, true, false]);
    expect(JSON.stringify(p0).length).toBeLessThan(4_000_000); // stays under the 4.5 MB response limit
  });
});

describe("change-only price history", () => {
  it("densify carries the last price forward to today", () => {
    const d = densify([{ date: "2026-11-01", price: 100, inStock: true }, { date: "2026-11-10", price: 80, inStock: true }], new Date("2026-11-15T12:00:00Z"));
    expect(d).toHaveLength(15);
    expect(d[8].price).toBe(100);
    expect(d[9]).toEqual({ date: "2026-11-10", price: 80, inStock: true });
    expect(d[14]).toEqual({ date: "2026-11-15", price: 80, inStock: true });
  });
  it("stats from change points equal stats from daily points", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const sparse = [{ date: "2026-10-01", price: 100, inStock: true }, { date: "2026-11-10", price: 80, inStock: true }];
    const daily = densify(sparse, now);
    expect(computeStats(sparse, now)).toEqual(computeStats(daily, now));
    expect(computeStats(sparse, now)).toMatchObject({ allTimeHigh: 100, allTimeLow: 80, median90d: 100, samples: 46 });
  });
});
