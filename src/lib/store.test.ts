import { describe, expect, it } from "vitest";
import { buildMockCatalog } from "./data/mock";
import { buildDeals } from "./deals";
import { activeFilterCount, buildProducts, EMPTY_FILTERS, filterProducts, sortProducts } from "./store";
import type { RiderInput, Sport } from "./types";

const locale = { country: "DE", currency: "EUR" as const, source: "default" as const };
const deals = buildDeals(buildMockCatalog(), locale, null).deals;
const rider: RiderInput = { weightKg: 75, heightCm: 178, bootSize: 10, bootSystem: "US", style: "all-mountain", skill: "intermediate", fit: "any", skateStyle: "street", waves: "small" };

describe("store view model", () => {
  it.each(["snow", "skate", "surf"] as Sport[])("groups %s offers into one product per board, cheapest first", (sport) => {
    const { products } = buildProducts(deals, sport, null);
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.board.sport).toBe(sport);
      expect(p.fits).toBeNull();
      expect(p.offers.map((o) => o.landed.total)).toEqual([...p.offers.map((o) => o.landed.total)].sort((a, b) => a - b));
      if (p.wasTotal !== null) expect(p.wasTotal).toBeGreaterThan(p.total);
    }
  });

  it("marks fit for a rider and the Fits me filter keeps only fitting boards", () => {
    const { products, fit } = buildProducts(deals, "snow", rider);
    expect(fit?.label).toMatch(/cm$/);
    const fitting = filterProducts(products, { ...EMPTY_FILTERS, fitsMe: true });
    expect(fitting.length).toBeGreaterThan(0);
    expect(fitting.every((p) => p.fits !== false)).toBe(true);
    expect(fitting.filter((p) => p.fits).every((p) => p.badges.some((b) => b.kind === "fits") && p.fitSizes.length > 0)).toBe(true);
  });

  it("sorts and filters by price and search", () => {
    const { products } = buildProducts(deals, "snow", null);
    const asc = sortProducts(products, "price-asc").map((p) => p.total);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const max = asc[Math.floor(asc.length / 2)];
    expect(filterProducts(products, { ...EMPTY_FILTERS, maxPrice: max }).every((p) => p.total <= max)).toBe(true);
    const brand = products[0].board.brand;
    expect(filterProducts(products, { ...EMPTY_FILTERS, q: brand.toLowerCase() }).every((p) => p.board.brand === brand || p.board.model.toLowerCase().includes(brand.toLowerCase()))).toBe(true);
    expect(activeFilterCount({ ...EMPTY_FILTERS, saleOnly: true, brands: ["a", "b"] })).toBe(3);
  });

  it("discount badges match the computed discount", () => {
    const { products } = buildProducts(deals, "snow", null);
    for (const p of products) {
      const has = p.badges.some((b) => b.kind === "discount");
      expect(has).toBe(p.discountPct >= 0.03);
    }
  });
});

describe("discount without a shop RRP", () => {
  it("falls back to the highest recorded price and labels any real discount", async () => {
    const { referencePrice, MIN_DISCOUNT } = await import("./store");
    const { products } = buildProducts(deals, "snow", null);
    const p = products[0];
    const noRrp = { ...p.best, board: { ...p.best.board, msrp: { amount: 0, currency: p.best.listing.price.currency } }, listing: { ...p.best.listing, listPrice: null, price: { ...p.best.listing.price, amount: 80 }, history: [{ date: "2026-10-01", price: 100, inStock: true }, { date: "2026-11-01", price: 80, inStock: true }] }, stats: null };
    expect(referencePrice(noRrp as never, [noRrp as never])).toEqual({ price: 100, source: "history" });
    const withRrp = { ...noRrp, listing: { ...noRrp.listing, listPrice: 120 } };
    expect(referencePrice(withRrp as never, [withRrp as never])).toEqual({ price: 120, source: "rrp" });
    const flat = { ...noRrp, listing: { ...noRrp.listing, history: [{ date: "2026-11-01", price: 80, inStock: true }] } };
    expect(referencePrice(flat as never, [flat as never])).toBeNull();
    for (const q of products) {
      expect(q.badges.some((b) => b.kind === "discount")).toBe(q.discountPct >= MIN_DISCOUNT);
      if (q.wasTotal !== null) expect(q.wasSource).not.toBeNull();
    }
  });
});
