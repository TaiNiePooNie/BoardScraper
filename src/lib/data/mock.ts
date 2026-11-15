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
    sport: "snow" as const,
    category: styles.includes("park") ? ("freestyle" as const) : styles.includes("freeride") ? ("powder" as const) : ("all-mountain" as const),
    brand, model, season: "2025/26", profile, shape, flex, styles,
    msrp: { amount: msrp, currency: "EUR" },
    images: [0, 1, 2].map((v) => boardImage((i * 37) % 360, v)),
    colors: [["red", "orange", "yellow", "green", "blue", "purple", "pink"][Math.floor((((i * 37) % 360) / 360) * 7)], i % 3 ? "black" : "white"],
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
        listPrice: msrpLocal,
        sizes: sizesFor(r),
        history,
        lastScrapedAt: "2026-11-13T06:00:00Z",
      });
    });
  });
  boards.push(...buildSkateSurf(listings));
  return { boards, listings, retailers: RETAILERS };
}

/* ───────────────────────── Skate & surf (fictional) ───────────────────────── */

/** Placeholder skate deck / surfboard silhouette. */
function shapeImage(kind: "skate" | "surf", hue: number, variant: number): string {
  const body = kind === "skate"
    ? `<rect x="150" y="60" width="100" height="480" rx="50" fill="hsl(${hue} 60% ${38 + variant * 10}%)"/><circle cx="200" cy="130" r="8" fill="#222"/><circle cx="200" cy="470" r="8" fill="#222"/>`
    : `<path d="M200 30 C285 170 285 430 235 570 L165 570 C115 430 115 170 200 30 Z" fill="hsl(${hue} 55% ${45 + variant * 10}%)"/><line x1="200" y1="40" x2="200" y2="565" stroke="#fff" stroke-width="3"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="hsl(${hue} 20% 94%)"/>${body}<text x="200" y="592" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#666">placeholder ${variant + 1}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** [brand, model, category, msrp €, sizes as [width in, length in]] */
const SKATE_MODELS: Array<[string, string, "deck" | "complete" | "cruiser" | "longboard", number, Array<[number, number]>]> = [
  ["Pavement Club", "Ghost Logo", "deck", 69, [[7.75, 31.5], [8, 31.75], [8.25, 32], [8.5, 32.25], [8.75, 32.5]]],
  ["Lowtide Skate Co.", "Night Swim", "deck", 74, [[8, 31.5], [8.25, 31.875], [8.5, 32.125], [9, 32.75]]],
  ["Concrete Saints", "Halo Pro", "deck", 79, [[8.25, 31.9], [8.38, 32], [8.5, 32.1]]],
  ["Pavement Club", "Mini Ripper", "deck", 54, [[7.5, 30], [7.625, 30.25]]],
  ["Lowtide Skate Co.", "First Push", "complete", 119, [[7.75, 31.25], [8, 31.5], [8.25, 32]]],
  ["Concrete Saints", "Street Ready", "complete", 149, [[8, 31.5], [8.25, 32], [8.5, 32.25]]],
  ["Coastline Wheelworks", "Pocket Rocketship", "cruiser", 139, [[8, 27]]],
  ["Driftline", "Tugger", "cruiser", 189, [[9, 30]]],
  ["Driftline", "Canyon Carver", "longboard", 249, [[9.5, 40]]],
  ["Coastline Wheelworks", "Pintail 44", "longboard", 219, [[9, 44]]],
];

/** [brand, model, category, msrp €, sizes as [feet, inches, litres]] */
const SURF_MODELS: Array<[string, string, "shortboard" | "fish" | "midlength" | "longboard-surf" | "foamie", number, Array<[number, number, number]>]> = [
  ["Saltglass Shapes", "Razor Pro", "shortboard", 749, [[5, 8, 25.5], [5, 10, 27.8], [6, 0, 29.9], [6, 2, 31.8], [6, 4, 34]]],
  ["Tidecraft", "Daily Driver", "shortboard", 679, [[5, 10, 30], [6, 0, 32.5], [6, 2, 34.8], [6, 4, 37]]],
  ["Saltglass Shapes", "Twin Keel Fish", "fish", 719, [[5, 4, 30], [5, 6, 32.5], [5, 8, 35], [5, 10, 38]]],
  ["Tidecraft", "Easy Egg", "midlength", 829, [[7, 0, 45], [7, 4, 50], [7, 8, 55], [8, 0, 60]]],
  ["Old Pier Surf Co.", "Classic Log", "longboard-surf", 999, [[9, 0, 68], [9, 2, 71], [9, 6, 76]]],
  ["Bubbleboard", "Soft Cruiser", "foamie", 329, [[7, 0, 55], [7, 6, 63], [8, 0, 72]]],
];

function buildSkateSurf(listings: Listing[]): BoardModel[] {
  const r = rng(7);
  const boards: BoardModel[] = [];
  const base = { season: "2025/26", profile: null, shape: null, flex: null, styles: [] as RidingStyle[], ambassadors: [] as Ambassador[] };
  const review = () => (r() > 0.3 ? { average: Math.round((3.6 + r() * 1.4) * 10) / 10, count: Math.floor(3 + r() * 120), sources: [] } : null);

  SKATE_MODELS.forEach(([brand, model, category, msrp], i) => {
    boards.push({
      ...base, id: `s${i}`, sport: "skate", category, brand, model, msrp: { amount: msrp, currency: "EUR" },
      images: [0, 1].map((v) => shapeImage("skate", (i * 53 + 20) % 360, v)), reviews: review(),
    });
  });
  SURF_MODELS.forEach(([brand, model, category, msrp], i) => {
    boards.push({
      ...base, id: `f${i}`, sport: "surf", category, brand, model, msrp: { amount: msrp, currency: "EUR" },
      images: [0, 1].map((v) => shapeImage("surf", (i * 47 + 190) % 360, v)), reviews: review(),
    });
  });

  const skateSizes = (dims: Array<[number, number]>): BoardSize[] =>
    dims.map(([w, l]) => ({ lengthCm: Math.round(l * 2.54), waist: "regular", label: `${w}"`, widthIn: w, inStock: r() > 0.2 }));
  const surfSizes = (dims: Array<[number, number, number]>): BoardSize[] =>
    dims.map(([ft, inch, vol]) => ({ lengthCm: Math.round((ft * 12 + inch) * 2.54), waist: "regular", label: `${ft}'${inch}"`, volumeL: vol, inStock: r() > 0.2 }));

  boards.forEach((b) => {
    const dims = b.sport === "skate" ? SKATE_MODELS[Number(b.id.slice(1))][4] : SURF_MODELS[Number(b.id.slice(1))][4];
    RETAILERS.forEach((ret) => {
      if (r() < 0.3) return;
      const msrpLocal = Math.round(b.msrp.amount * FX[ret.currency]);
      const history = historyFor(r, msrpLocal);
      const sizes = b.sport === "skate" ? skateSizes(dims as Array<[number, number]>) : surfSizes(dims as Array<[number, number, number]>);
      if (!sizes.some((s) => s.inStock)) sizes[0].inStock = true;
      listings.push({
        id: `${b.id}-${ret.id}`,
        boardId: b.id,
        retailerId: ret.id,
        url: `${ret.homepage}/${b.sport}/${b.brand}-${b.model}`.toLowerCase().replace(/[^a-z0-9/:.-]+/g, "-"),
        price: { amount: history[history.length - 1].price, currency: ret.currency },
        listPrice: msrpLocal,
        sizes,
        history,
        lastScrapedAt: "2026-11-13T06:00:00Z",
      });
    });
  });
  return boards;
}
