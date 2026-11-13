/**
 * Deterministic mock fixtures so the UI runs before the scraper/DB exist.
 * Brands, models and riders are FICTIONAL. Real data comes from src/scraper.
 */
import type { Ambassador, BoardModel, BoardProfile, BoardShape, BoardSize, Listing, PricePoint, Retailer, RidingStyle } from "../types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

/** Placeholder product image (stand-in for scraped photos). */
function boardImage(hue: number, variant: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="hsl(${hue} 20% 94%)"/><rect x="140" y="30" width="120" height="540" rx="60" fill="hsl(${hue} 65% ${40 + variant * 10}%)"/><rect x="165" y="${150 + variant * 40}" width="70" height="${120 - variant * 20}" rx="10" fill="hsl(${(hue + 160) % 360} 70% 60%)"/><text x="200" y="590" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#666">placeholder ${variant + 1}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const RIDERS: Ambassador[] = [
  { id: "r1", name: "Kai Lindqvist", disciplines: ["park"], confidence: "confirmed" },
  { id: "r2", name: "Mara Okonkwo", disciplines: ["freeride"], confidence: "confirmed" },
  { id: "r3", name: "Theo Brandt", disciplines: ["all-mountain", "freeride"], confidence: "likely" },
  { id: "r4", name: "Juno Arakawa", disciplines: ["park", "all-mountain"], confidence: "confirmed" },
  { id: "r5", name: "Sol Marchetti", disciplines: ["freeride"], confidence: "likely" },
];

export const RETAILERS: Retailer[] = [
  {
    id: "alpine-depot", name: "Alpine Depot (mock)", homepage: "https://example.com/alpine", country: "DE", currency: "EUR", pricesIncludeVat: true,
    shipping: [{ destinations: ["DE"], cost: 0, etaDays: [1, 3] }, { destinations: ["AT","NL","BE","FR","IT","ES","DK","SE","PL"], cost: 14.9, freeAbove: 300, etaDays: [3, 6] }, { destinations: ["*"], cost: 49, etaDays: [6, 14] }],
  },
  {
    id: "boardroom-uk", name: "Boardroom UK (mock)", homepage: "https://example.com/boardroom", country: "GB", currency: "GBP", pricesIncludeVat: true,
    shipping: [{ destinations: ["GB"], cost: 6.95, freeAbove: 100, etaDays: [1, 2] }, { destinations: ["*"], cost: 35, etaDays: [5, 10] }],
  },
  {
    id: "powder-co", name: "Powder Co (mock)", homepage: "https://example.com/powder", country: "US", currency: "USD", pricesIncludeVat: false,
    shipping: [{ destinations: ["US"], cost: 0, etaDays: [2, 5] }, { destinations: ["CA"], cost: 29, etaDays: [4, 8] }, { destinations: ["*"], cost: 79, etaDays: [7, 15] }],
  },
];

const MODELS: Array<[brand: string, model: string, profile: BoardProfile, shape: BoardShape, flex: number, styles: RidingStyle[], msrpEur: number, riderIds: string[]]> = [
  ["Northline", "Jibstick", "hybrid-rocker", "true-twin", 3, ["park"], 449, ["r1"]],
  ["Northline", "Ridge Runner", "hybrid-camber", "directional-twin", 6, ["all-mountain"], 549, ["r3"]],
  ["Glacier Co.", "Couloir", "directional-camber", "directional", 8, ["freeride"], 699, ["r2", "r5"]],
  ["Glacier Co.", "Spring Fling", "rocker", "true-twin", 2, ["park"], 399, []],
  ["Vantablock", "Quiver One", "camber", "directional-twin", 5, ["all-mountain", "park"], 579, ["r4"]],
  ["Vantablock", "Fishtail", "directional-camber", "tapered", 7, ["freeride", "all-mountain"], 649, ["r5"]],
  ["Summit Theory", "Everyday", "hybrid-camber", "true-twin", 5, ["all-mountain"], 499, []],
  ["Summit Theory", "Big Line", "camber", "directional", 9, ["freeride"], 799, ["r2"]],
  ["Driftwood", "Butter Knife", "flat", "true-twin", 3, ["park"], 429, ["r1", "r4"]],
  ["Driftwood", "Treeline", "hybrid-camber", "directional", 6, ["freeride", "all-mountain"], 599, ["r3"]],
];

const LENGTHS = [144, 147, 150, 152, 154, 156, 158, 160, 162, 164, 166];

function sizesFor(r: () => number): BoardSize[] {
  const out: BoardSize[] = [];
  for (const l of LENGTHS) {
    if (r() > 0.25) out.push({ lengthCm: l, waist: "regular", label: `${l}`, inStock: r() > 0.2 });
    if (l >= 154 && r() > 0.35) out.push({ lengthCm: l, waist: "wide", label: `${l}W`, inStock: r() > 0.2 });
  }
  return out;
}

function historyFor(r: () => number, msrp: number, days = 240): PricePoint[] {
  const pts: PricePoint[] = [];
  let p = msrp * (0.9 + r() * 0.1);
  const today = new Date("2026-11-13");
  for (let d = days; d >= 0; d -= 4) {
    // occasional sales and drift
    if (r() < 0.08) p = msrp * (0.55 + r() * 0.3);
    else if (r() < 0.15) p = msrp * (0.85 + r() * 0.15);
    else p = p * (0.99 + r() * 0.02);
    const date = new Date(today.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    pts.push({ date, price: Math.round(Math.min(p, msrp)), inStock: true });
  }
  // Today's price: spread across the full tier range for a useful demo.
  const lowSoFar = Math.min(...pts.map((x) => x.price));
  const roll = r();
  pts[pts.length - 1].price = Math.round(roll < 0.2 ? lowSoFar * (0.95 + r() * 0.05) : roll < 0.6 ? msrp * (0.6 + r() * 0.2) : msrp * (0.8 + r() * 0.2));
  return pts;
}

const FX: Record<string, number> = { EUR: 1, GBP: 0.85, USD: 1.08 };

export function buildMockCatalog() {
  const r = rng(42);
  const boards: BoardModel[] = MODELS.map(([brand, model, profile, shape, flex, styles, msrp, riderIds], i) => ({
    id: `b${i}`,
    brand, model, season: "2025/26", profile, shape, flex, styles,
    msrp: { amount: msrp, currency: "EUR" },
    images: [0, 1, 2].map((v) => boardImage((i * 37) % 360, v)),
    ambassadors: RIDERS.filter((x) => riderIds.includes(x.id)),
    reviews: r() > 0.15 ? { average: Math.round((3.4 + r() * 1.6) * 10) / 10, count: Math.floor(5 + r() * 300), sources: [] } : null,
  }));

  const listings: Listing[] = [];
  boards.forEach((b) => {
    RETAILERS.forEach((ret) => {
      if (r() < 0.35) return;
      const msrpLocal = Math.round(b.msrp.amount * FX[ret.currency]);
      const history = historyFor(r, msrpLocal);
      listings.push({
        id: `${b.id}-${ret.id}`,
        boardId: b.id,
        retailerId: ret.id,
        url: `${ret.homepage}/${b.brand}-${b.model}`.toLowerCase().replace(/[^a-z0-9/:.-]+/g, "-"),
        price: { amount: history[history.length - 1].price, currency: ret.currency },
        sizes: sizesFor(r),
        history,
        lastScrapedAt: "2026-11-13T06:00:00Z",
      });
    });
  });
  return { boards, listings, retailers: RETAILERS };
}
