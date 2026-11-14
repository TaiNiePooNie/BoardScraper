import { describe, expect, it } from "vitest";
import { lengthFromWeight, matchSizes, recommend, requiresWide } from "./sizing";
import { computeStats, gradeDeal } from "./grading";
import { landedCost } from "./pricing/landedCost";
import { buildDeals } from "./deals";
import { buildMockCatalog } from "./data/mock";
import type { PricePoint, Retailer } from "./types";

describe("sizing", () => {
  it("is weight-driven", () => {
    expect(lengthFromWeight(70)).toBe(154);
    expect(lengthFromWeight(75)).toBeCloseTo(155.5);
    const a = recommend({ weightKg: 80, heightCm: 165, bootSize: 9, bootSystem: "US", style: "all-mountain" });
    const b = recommend({ weightKg: 80, heightCm: 185, bootSize: 9, bootSystem: "US", style: "all-mountain" });
    expect(Math.abs(a.idealLengthCm - b.idealLengthCm)).toBeLessThanOrEqual(1);
  });

  it("enforces wide at US 11 / EU 44.5", () => {
    expect(requiresWide(10.5, "US")).toBe(false);
    expect(requiresWide(11, "US")).toBe(true);
    expect(requiresWide(44, "EU")).toBe(false);
    expect(requiresWide(44.5, "EU")).toBe(true);
  });

  it("filters out non-wide sizes for wide riders and wide sizes otherwise", () => {
    const sizes = [
      { lengthCm: 158, waist: "regular" as const, label: "158", inStock: true },
      { lengthCm: 158, waist: "wide" as const, label: "158W", inStock: true },
    ];
    const wide = recommend({ weightKg: 82, heightCm: 185, bootSize: 11.5, bootSystem: "US", style: "all-mountain" });
    expect(matchSizes(sizes, wide).map((m) => m.size.label)).toEqual(["158W"]);
    const reg = recommend({ weightKg: 82, heightCm: 185, bootSize: 9, bootSystem: "US", style: "all-mountain" });
    expect(matchSizes(sizes, reg).map((m) => m.size.label)).toEqual(["158"]);
  });

  it("style shifts length", () => {
    const base = { weightKg: 75, heightCm: 178, bootSize: 9, bootSystem: "US" as const };
    expect(recommend({ ...base, style: "park" }).idealLengthCm).toBeLessThan(recommend({ ...base, style: "freeride" }).idealLengthCm);
  });
});

describe("grading", () => {
  const hist = (prices: number[]): PricePoint[] =>
    prices.map((price, i) => ({ date: new Date(Date.now() - (prices.length - i) * 86_400_000).toISOString().slice(0, 10), price, inStock: true }));

  it("at all-time low with big discount → extremely-good", () => {
    const s = computeStats(hist([500, 500, 480, 450, 300]));
    expect(gradeDeal(300, 600, s).tier).toBe("extremely-good");
  });

  it("not discounted → bad", () => {
    expect(gradeDeal(600, 600, null).tier).toBe("bad");
  });

  it("caps 'sales' above the recent median at normal", () => {
    const s = computeStats(hist([200, 200, 200, 200, 200, 200]));
    expect(gradeDeal(300, 600, s).tier).toBe("normal");
  });

  it("falls back to discount-only without history", () => {
    const g = gradeDeal(330, 600, null);
    expect(g.score).toBe(90);
    expect(g.reasons.some((r) => r.includes("Insufficient"))).toBe(true);
  });
});

describe("landed cost", () => {
  const de: Retailer = {
    id: "x", name: "x", homepage: "https://x.test", country: "DE", currency: "EUR", pricesIncludeVat: true,
    shipping: [{ destinations: ["*"], cost: 10 }],
  };
  it("rebases VAT intra-EU (OSS)", () => {
    const lc = landedCost(119, de, { country: "NL", currency: "EUR", source: "override" })!;
    expect(lc.item).toBeCloseTo(121); // 100 net × 1.21
    expect(lc.total).toBeCloseTo(133.1);
  });
  it("strips VAT and adds import costs for export", () => {
    const lc = landedCost(119, de, { country: "CH", currency: "EUR", source: "override" })!;
    expect(lc.vatIncluded).toBe(false);
    expect(lc.total).toBeCloseTo(110 * 1.081);
  });
});

describe("pipeline", () => {
  it("never returns a non-wide size to a wide-boot rider", () => {
    const res = buildDeals(buildMockCatalog(), { country: "DE", currency: "EUR", source: "default" }, {
      weightKg: 85, heightCm: 188, bootSize: 45, bootSystem: "EU", style: "freeride",
    });
    expect(res.deals.length).toBeGreaterThan(0);
    for (const d of res.deals) for (const m of d.matchingSizes) expect(m.size.waist).toBe("wide");
  });
});

describe("budget view (offers)", async () => {
  const { budgetStatus, groupDeals, sortGroups } = await import("./offers");
  const { isFullPrice } = await import("./grading");
  const locale = { country: "DE", currency: "EUR" as const, source: "default" as const };

  it("budget status incl. 10% 'slightly over' band", () => {
    const b = { min: 300, max: 500 };
    expect(budgetStatus(250, b)).toBe("under");
    expect(budgetStatus(400, b)).toBe("in");
    expect(budgetStatus(540, b)).toBe("over");
    expect(budgetStatus(560, b)).toBe("out");
    expect(budgetStatus(9999, { min: null, max: null })).toBe("none");
  });

  it("one group per board; best = cheapest delivered offer", () => {
    const { deals } = buildDeals(buildMockCatalog(), locale, null);
    const groups = groupDeals(deals, { min: null, max: null }, null);
    expect(groups.length).toBe(new Set(deals.map((d) => d.board.id)).size);
    for (const g of groups) {
      expect(g.best.landed.total).toBe(Math.min(...g.offers.map((o) => o.landed.total)));
      expect(g.value.score).toBeGreaterThanOrEqual(0);
      expect(g.value.score).toBeLessThanOrEqual(100);
    }
    const byPrice = sortGroups(groups, "price");
    expect(byPrice[0].best.landed.total).toBeLessThanOrEqual(byPrice.at(-1)!.best.landed.total);
  });

  it("over-budget boards score lower than the same board in budget", () => {
    const { deals } = buildDeals(buildMockCatalog(), locale, null);
    const total = deals[0].landed.total;
    const [inB] = groupDeals([deals[0]], { min: null, max: total + 1 }, null);
    const [over] = groupDeals([deals[0]], { min: null, max: total / 1.05 }, null);
    expect(over.budget).toBe("over");
    expect(over.value.score).toBeLessThan(inB.value.score);
  });

  it("links last season's cheaper version of the same model", () => {
    const cat = buildMockCatalog();
    const board = cat.boards[0];
    const listing = cat.listings.find((l) => l.boardId === board.id)!;
    const old = { ...board, id: "old", season: "2024/25", model: `${board.model} 2025` };
    const oldListing = { ...listing, id: "old-l", boardId: "old", price: { ...listing.price, amount: listing.price.amount * 0.6 } };
    const { deals } = buildDeals({ ...cat, boards: [board, old], listings: [listing, oldListing] }, locale, null);
    const g = groupDeals(deals, { min: null, max: null }, null).find((x) => x.id === board.id)!;
    expect(g.lastSeason?.boardId).toBe("old");
    expect(g.lastSeason!.savingPct).toBeGreaterThan(0.3);
  });

  it("full price label", () => {
    expect(isFullPrice({ discountPct: 0 })).toBe(true);
    expect(isFullPrice({ discountPct: 0.15 })).toBe(false);
  });
});

describe("timezone → country", async () => {
  const { countryFromTimezone } = await import("./tzCountry");
  it("maps common zones and ignores unknown ones", () => {
    expect(countryFromTimezone("Europe/Amsterdam")).toBe("NL");
    expect(countryFromTimezone("Europe/London")).toBe("GB");
    expect(countryFromTimezone("America/Denver")).toBe("US");
    expect(countryFromTimezone("Asia/Kolkata")).toBeNull();
  });
});

describe("skill, fit and stats", async () => {
  const { boardStats } = await import("./stats");
  const { fitAllows, isWomensBoard } = await import("./sizing");
  const base = { weightKg: 75, heightCm: 178, bootSize: 9, bootSystem: "US" as const, style: "all-mountain" as const };

  it("skill shifts length and flex", () => {
    const beg = recommend({ ...base, skill: "beginner" });
    const exp = recommend({ ...base, skill: "expert" });
    expect(beg.idealLengthCm).toBeLessThan(exp.idealLengthCm);
    expect(beg.flexRange[1]).toBeLessThan(exp.flexRange[1]);
    expect(recommend(base).idealLengthCm).toBe(recommend({ ...base, skill: "intermediate" }).idealLengthCm);
  });

  it("fit preference", () => {
    expect(isWomensBoard("Feelgood Women's")).toBe(true);
    expect(isWomensBoard("Custom")).toBe(false);
    expect(fitAllows("womens", "Feelgood Women's")).toBe(true);
    expect(fitAllows("womens", "Custom")).toBe(false);
    expect(fitAllows("mens", "Feelgood Women's")).toBe(false);
    expect(fitAllows("any", "Feelgood Women's")).toBe(true);
  });

  it("stats: soft rocker twin is forgiving, stiff directional camber is fast", () => {
    const park = boardStats({ flex: 3, profile: "rocker", shape: "true-twin" });
    const charger = boardStats({ flex: 9, profile: "directional-camber", shape: "tapered" });
    expect(park.forgiveness).toBeGreaterThan(charger.forgiveness);
    expect(charger.speed).toBeGreaterThan(park.speed);
    expect(charger.float).toBeGreaterThan(park.float);
    expect(park.estimated).toBe(false);
    expect(boardStats({ flex: null, profile: null, shape: null }).estimated).toBe(true);
    for (const v of Object.values(charger).filter((x) => typeof x === "number")) expect(v).toBeGreaterThanOrEqual(1);
  });
});
