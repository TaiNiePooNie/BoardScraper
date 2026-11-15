import { describe, expect, it } from "vitest";
import { buildMockCatalog } from "./data/mock";
import { buildDeals } from "./deals";
import { activeFilterCount, buildProducts, EMPTY_FILTERS, filterProducts, MIN_DISCOUNT, sortProducts, viewFromQuery, viewToQuery, type Product, type StoreFilters } from "./store";
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
    expect(activeFilterCount({ ...EMPTY_FILTERS, minDiscount: MIN_DISCOUNT, brands: ["a", "b"] })).toBe(3);
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

describe("audience (kids / men / women, multi-select)", () => {
  it("skate & surf: women's selection shows adult boards (no men's/women's split there)", async () => {
    const { audienceAllows, riderFits, kidsOnly } = await import("./sizing");
    expect(audienceAllows(["womens"], "skate", "Baker Brand Logo Deck")).toBe(true);
    expect(audienceAllows(["womens"], "surf", "Firewire Seaside")).toBe(true);
    expect(audienceAllows(["kids"], "skate", "Baker Brand Logo Deck")).toBe(false);
    expect(audienceAllows(["kids"], "skate", "Mini Logo Youth Complete")).toBe(true);
    expect(audienceAllows(["womens"], "snow", "Burton Custom")).toBe(false);
    expect(audienceAllows(["womens", "mens"], "snow", "Burton Custom")).toBe(true);
    expect(audienceAllows(["kids", "womens"], "snow", "Burton Yeasayer Women's")).toBe(true);
    expect(audienceAllows([], "snow", "anything")).toBe(true);
    expect(riderFits({ fit: "kids" })).toEqual(["kids"]);
    expect(riderFits({ fit: "any", fits: ["mens", "womens"] })).toEqual(["mens", "womens"]);
    expect(kidsOnly({ fits: ["kids", "mens"] })).toBe(false);
  });
  it("every sport has products for a women-only rider", () => {
    const r = { ...rider, fits: ["womens"] as ("womens")[] };
    for (const s of ["skate", "surf"] as const) {
      const { products } = buildProducts(deals, s, r);
      expect(products.some((p) => p.fits)).toBe(true);
    }
  });
});

describe("stock scarcity", () => {
  const sz = (label: string, inStock: boolean) => ({ lengthCm: Number(label), waist: "regular" as const, label, inStock });
  const offer = (id: string, sizes: ReturnType<typeof sz>[]) => ({ ...deals[0], retailer: { ...deals[0].retailer, id }, listing: { ...deals[0].listing, id, sizes } });
  it("flags last-season boards with few sizes left as 'last'", async () => {
    const { stockInfo } = await import("./store");
    const offers = [offer("a", [sz("150", false), sz("154", false), sz("158", true), sz("162", false)])];
    const s = stockInfo(offers as never, null, true);
    expect(s).toMatchObject({ sizesLeft: 1, sizesTotal: 4, level: "last" });
    expect(s.note).toMatch(/aren't restocked/);
    expect(stockInfo(offers as never, null, false).level).toBe("low"); // 1 of 4 left
  });
  it("your size at only one shop is 'low'; plenty of stock is 'ok'", async () => {
    const { stockInfo } = await import("./store");
    const offers = [offer("a", [sz("154", true), sz("158", true), sz("162", true)]), offer("b", [sz("154", false), sz("158", true), sz("162", true)])];
    expect(stockInfo(offers as never, new Set(["154"]), false)).toMatchObject({ shopsWithYourSize: 1, level: "low" });
    expect(stockInfo(offers as never, new Set(["158"]), false)).toMatchObject({ shopsWithYourSize: 2, level: "ok", note: null });
  });
  it("scarce last-season stock overrides 'wait for the sale'", async () => {
    const { buyOrWait } = await import("./sales");
    const base = { now: new Date("2026-11-15T00:00:00Z"), country: "US", sport: "snow" as const, discountPct: 0.05, lowestIn90: false };
    expect(buyOrWait(base)?.kind).toBe("wait");
    expect(buyOrWait({ ...base, stock: "last" })?.title).toBe("Don't wait too long");
    expect(buyOrWait({ ...base, stock: "low" })?.title).toMatch(/stock is low/);
  });
});

describe("duplicates are merged", () => {
  it("same board from two seasons/shops → one product; same shop twice → one offer with all sizes", async () => {
    const { productKey } = await import("./store");
    const a = { sport: "snow" as const, brand: "Nitro", model: "Optisym 2026", category: null };
    expect(productKey(a)).toBe(productKey({ ...a, model: "Optisym Snowboard 2025/26" }));
    expect(productKey(a)).not.toBe(productKey({ ...a, model: "Optisym Women's" }));
    expect(productKey({ sport: "skate", brand: "Baker", model: "Logo", category: "deck" })).not.toBe(productKey({ sport: "skate", brand: "Baker", model: "Logo", category: "complete" }));

    const d0 = deals.find((d) => d.board.sport === "snow")!;
    const sz = (label: string, inStock = true) => ({ lengthCm: Number(label), waist: "regular" as const, label, inStock });
    const one = { ...d0, board: { ...d0.board, id: "x1", model: "Dup Test 2026", season: "2025/26" }, listing: { ...d0.listing, id: "l1", url: "https://shop.test/a", sizes: [sz("154")] } };
    const two = { ...d0, board: { ...d0.board, id: "x2", model: "Dup Test Snowboard", season: "2026/27" }, listing: { ...d0.listing, id: "l2", url: "https://shop.test/b", sizes: [sz("158")] } };
    const { products } = buildProducts([one, two] as never, "snow", null);
    expect(products).toHaveLength(1);
    expect(products[0].boardIds.sort()).toEqual(["x1", "x2"]);
    expect(products[0].offers).toHaveLength(1);
    expect(products[0].offers[0].listing.sizes.map((z) => z.label).sort()).toEqual(["154", "158"]);
  });
});

describe("quick filters", () => {
  const { products } = buildProducts(deals, "snow", rider);
  const has = (p: Product, kind: string) => p.badges.some((b) => b.kind === kind);
  /** A product with the given fields overridden, for cases the mock catalog may not contain. */
  const fake = (over: Partial<Product>): Product => ({ ...products[0], discountPct: 0, dropPct: 0, badges: [], stock: { ...products[0].stock, level: "ok" }, ...over });

  it("On sale and the discount steps keep boards with at least that discount", () => {
    const sale = filterProducts(products, { ...EMPTY_FILTERS, minDiscount: MIN_DISCOUNT });
    expect(sale.length).toBeGreaterThan(0);
    expect(sale.every((p) => has(p, "discount"))).toBe(true);
    expect(sale.length).toBe(products.filter((p) => has(p, "discount")).length);
    const deep = filterProducts(products, { ...EMPTY_FILTERS, minDiscount: 0.3 });
    expect(deep.every((p) => p.discountPct >= 0.3)).toBe(true);
    expect(deep.length).toBeLessThanOrEqual(sale.length);
  });

  it("Price dropped, Lowest in 90 days and Last sizes match what the cards show", () => {
    const list = [
      fake({ id: "plain" }),
      fake({ id: "drop", dropPct: 0.12, badges: [{ kind: "drop", label: "Price dropped" }] }),
      // At a 90-day low after a recent drop: the card says "Lowest", but it did drop too.
      fake({ id: "low", dropPct: 0.2, badges: [{ kind: "lowest", label: "Lowest in 90 days" }] }),
      fake({ id: "last", stock: { ...products[0].stock, level: "last" }, badges: [{ kind: "stock", label: "Last sizes" }] }),
      fake({ id: "few", stock: { ...products[0].stock, level: "low" }, badges: [{ kind: "stock", label: "Few left" }] }),
    ];
    const ids = (f: Partial<StoreFilters>) => filterProducts(list, { ...EMPTY_FILTERS, ...f }).map((p) => p.id);
    expect(ids({ priceDrop: true })).toEqual(["drop", "low"]);
    expect(ids({ lowest: true })).toEqual(["low"]);
    expect(ids({ lastSizes: true })).toEqual(["last", "few"]);
    expect(ids({ priceDrop: true, lowest: true })).toEqual(["low"]);
    expect(sortProducts(list, "drop").slice(0, 2).map((p) => p.id)).toEqual(["low", "drop"]);

    // On real data the filters agree with the badges.
    expect(filterProducts(products, { ...EMPTY_FILTERS, lowest: true }).every((p) => has(p, "lowest"))).toBe(true);
    expect(filterProducts(products, { ...EMPTY_FILTERS, lastSizes: true }).every((p) => has(p, "stock"))).toBe(true);
    expect(products.filter((p) => has(p, "drop")).every((p) => p.dropPct > 0)).toBe(true);
  });

  it("counts every active filter once", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: "burton", category: "powder" })).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, fitsMe: true, minDiscount: 0.2, priceDrop: true, lowest: true, lastSizes: true, maxPrice: 400, audience: ["kids"], shops: ["evo"] })).toBe(8);
  });
});

describe("view in the URL", () => {
  it("a default view is just the sport", () => {
    expect(viewToQuery({ sport: "skate", filters: EMPTY_FILTERS, sort: "recommended" }).toString()).toBe("sport=skate");
    expect(viewFromQuery(new URLSearchParams(""))).toEqual({ sport: null, filters: EMPTY_FILTERS, sort: "recommended" });
  });

  it("round-trips sport, type, search, sort and every filter", () => {
    const filters: StoreFilters = { q: "fish & chips", fitsMe: true, category: "fish", audience: ["kids", "womens"], brands: ["Lib Tech", "A&B"], colors: ["blue", "black"], shops: ["evo", "blue-tomato"], maxPrice: 450, minDiscount: 0.2, priceDrop: true, lowest: true, lastSizes: true };
    const q = viewToQuery({ sport: "surf", filters, sort: "drop" });
    expect(viewFromQuery(new URLSearchParams(q.toString()))).toEqual({ sport: "surf", filters, sort: "drop" });
    const onSale = viewToQuery({ sport: "snow", filters: { ...EMPTY_FILTERS, minDiscount: MIN_DISCOUNT }, sort: "recommended" });
    expect(onSale.toString()).toBe("sport=snow&sale=1");
    expect(viewFromQuery(onSale).filters.minDiscount).toBe(MIN_DISCOUNT);
  });

  it("ignores junk values and keeps unrelated params out", () => {
    const v = viewFromQuery(new URLSearchParams("sport=bmx&type=nope&sort=cheapest&sale=abc&max=-5&for=dogs&drop=yes&board=b1&signedin=1"));
    expect(v).toEqual({ sport: null, filters: EMPTY_FILTERS, sort: "recommended" });
    expect(viewFromQuery(new URLSearchParams("sort=__proto__")).sort).toBe("recommended");
  });
});
