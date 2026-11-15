import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openDb, type DbHandle } from "@/db/client";
import { boards, listingSizes } from "@/db/schema";
import { buildMockCatalog } from "@/lib/data/mock";
import { buildDeals } from "@/lib/deals";
import { RETAILERS } from "@/lib/retailers";
import { matchSizesFor, recommendFor, skateFit, surfFit } from "@/lib/sizing";
import { BoardCategory, CATEGORIES_BY_SPORT, type BoardSize, type RiderInput } from "@/lib/types";
import { displayModelFor, sportBoardKey } from "./parse/normalize";
import { buildSizes, pageFeatures, parseSizeFor, parseSkateSize, parseSurfSize, surfVolume } from "./parse/sizes";
import { classifyCategory, detectSport, isSkateSurfGear, NO_SPECS, snowCategory } from "./parse/sport";
import { htmlToText } from "./parse/text";
import { parseShopifyProduct } from "./retailers/evo";
import { findBreadcrumbs, findProductNode, parseJsonLdProduct } from "./retailers/sitemapJsonLd";
import { ingestProduct, upsertRetailer } from "./ingest";
import type { ScrapedProduct } from "./types";

const rider = (over: Partial<RiderInput> = {}): RiderInput => ({
  weightKg: 75, heightCm: 178, bootSize: 10, bootSystem: "US", style: "all-mountain", ...over,
});
const deck = (w: number, inStock = true): BoardSize => ({ lengthCm: 0, waist: "regular", label: `${w}"`, widthIn: w, inStock });
const surf = (cm: number, vol?: number): BoardSize => ({ lengthCm: cm, waist: "regular", label: `${cm}`, inStock: true, ...(vol ? { volumeL: vol } : {}) });

describe("multi-sport fit", () => {
  it("skate width grows with shoe size and transition/cruise style", () => {
    const small = skateFit(rider({ bootSize: 6 }));
    const big = skateFit(rider({ bootSize: 12 }));
    expect(small.unit).toBe("in");
    expect(big.ideal).toBeGreaterThan(small.ideal);
    expect(skateFit(rider({ skateStyle: "transition" })).ideal).toBeGreaterThan(skateFit(rider({ skateStyle: "street" })).ideal);
    expect(skateFit(rider({ fit: "kids", bootSize: 3 })).ideal).toBeLessThan(7.5);
  });
  it("surf volume: beginners get far more litres; small waves add volume", () => {
    const beg = surfFit(rider({ skill: "beginner" }));
    const pro = surfFit(rider({ skill: "expert" }));
    expect(beg.unit).toBe("L");
    expect(beg.ideal).toBeGreaterThan(pro.ideal * 1.5);
    expect(surfFit(rider({ waves: "small" })).ideal).toBeGreaterThan(surfFit(rider({ waves: "big" })).ideal);
    expect(pro.lengthRangeCm![0]).toBeLessThan(beg.lengthRangeCm![0]);
  });
  it("matchSizesFor: skate by width, best first; sizes without width ignored", () => {
    const fit = skateFit(rider({ bootSize: 10, skateStyle: "park" })); // 8.125"
    const m = matchSizesFor([deck(7.5), deck(8.25), deck(8), deck(9), { lengthCm: 76, waist: "regular", label: '30" long', inStock: true }], fit);
    expect(m.map((x) => x.size.widthIn)).toEqual([8.25, 8]);
    expect(m.every((x) => x.fits)).toBe(true);
  });
  it("matchSizesFor: surf by volume, else by length", () => {
    const fit = surfFit(rider({ skill: "intermediate", waves: "medium" })); // ~34 L
    const byVol = matchSizesFor([surf(178, 28), surf(185, 33.5), surf(193, 38), surf(213, 50)], fit);
    expect(byVol.map((x) => x.size.volumeL)).toEqual([33.5]);
    const [a, b] = fit.lengthRangeCm!;
    const byLen = matchSizesFor([surf(150), surf(Math.round((a + b) / 2)), surf(300)], fit);
    expect(byLen).toHaveLength(1);
  });
  it("recommendFor dispatches per sport", () => {
    expect(recommendFor("snow", rider()).unit).toBe("cm");
    expect(recommendFor("skate", rider()).unit).toBe("in");
    expect(recommendFor("surf", rider()).unit).toBe("L");
  });
});

describe("skate & surf size labels", () => {
  it.each([
    ['8.25"', 8.25], ["8.25 in", 8.25], ["8.25", 8.25], ["8.38 in", 8.38], ["Navy / 8.5 in", 8.5], ["8.3875", 8.3875], ["8,5", 8.5], ["8.25″", 8.25],
  ])("skate width %s", (label, w) => {
    expect(parseSkateSize(label)).toMatchObject({ widthIn: w, label: `${w}"`, lengthCm: 0 });
  });
  it("skate: cruiser/longboard lengths, W x L pairs", () => {
    expect(parseSkateSize("27 in")).toMatchObject({ lengthCm: 69, label: '27" long' });
    expect(parseSkateSize("27 in")!.widthIn).toBeUndefined();
    expect(parseSkateSize('8.5" x 32"')).toMatchObject({ widthIn: 8.5, lengthCm: 81 });
    expect(parseSkateSize("36 X9.25")).toMatchObject({ widthIn: 9.25, lengthCm: 91 });
    expect(parseSkateSize("Uni")).toBeNull();
    expect(parseSkateSize("Default Title")).toBeNull();
  });
  it.each([
    [`5'10"`, `5'10"`, 178], [`5' 10"`, `5'10"`, 178], ["5ft10", `5'10"`, 178], ["7'6", `7'6"`, 229], [`6'`, `6'0"`, 183],
    [`9'0''`, `9'0"`, 274], [`Pink / 8'0"`, `8'0"`, 244], ["56''", `4'8"`, 142],
  ])("surf length %s", (raw, label, cm) => {
    expect(parseSurfSize(raw)).toMatchObject({ label, lengthCm: cm });
  });
  it("surf volume", () => {
    expect(parseSurfSize(`5'10" 32.5L`)).toMatchObject({ lengthCm: 178, volumeL: 32.5 });
    expect(parseSurfSize(`6'0" / 35 L`)!.volumeL).toBe(35);
    expect(surfVolume("32,5 l")).toBe(32.5);
    expect(surfVolume("This 48-liter wave magnet")).toBe(48);
    expect(surfVolume("6 l bottle")).toBeNull();
  });
  it("snow labels unchanged through parseSizeFor", () => {
    expect(parseSizeFor("snow", "158 Wide")).toMatchObject({ lengthCm: 158, waist: "wide", label: "158W" });
  });
  it("page features (Blue Tomato spec list)", () => {
    expect(pageFeatures("skate", "Width 9.75 inch Length (inch) 44 inch Truck Width 180 mm")).toEqual({ widthIn: 9.75, lengthIn: 44 });
    expect(pageFeatures("skate", "Truck Width 9.75 inch")).toEqual({});
    expect(pageFeatures("surf", htmlToText("Length 5&#x27;9 ft Width 19.5 inch Volume 29.08 liter"))).toEqual({ surfLength: "5'9", volumeL: 29.08 });
  });
  it("one-size products take the size from features or title", () => {
    expect(buildSizes("skate", [{ label: "Uni", inStock: true, price: 50 }], "G1 Orbit Deck 8.25″ Skateboard Deck")).toMatchObject([{ widthIn: 8.25, price: 50 }]);
    expect(buildSizes("skate", [{ label: "30 in", inStock: true }], "Tugger Cruiser", { widthIn: 9 })).toMatchObject([{ widthIn: 9, lengthCm: 76, label: '9"' }]);
    expect(buildSizes("surf", [{ label: "Default Title", inStock: true }], "Odysea 7'0\" Log")).toMatchObject([{ lengthCm: 213 }]);
    expect(buildSizes("surf", [{ label: "Uni", inStock: true }], "Hybrid 5'10 Surf", { volumeL: 42 })).toMatchObject([{ lengthCm: 178, volumeL: 42 }]);
    expect(buildSizes("surf", [{ label: `9'0" B Grade`, inStock: true }, { label: `9'0"`, inStock: false }], "Log")).toMatchObject([{ inStock: false }]);
  });
});

describe("classification", () => {
  it.each([
    ["Skateboard Decks", "skate"], ["Cruiser Complete", "skate"], ["Longboard Completes", "skate"], ["Skate Shop Longboard & Cruiser Longboards", "skate"],
    ["Arbor C7 Surfskate Complete", "skate"], ["Shortboards", "surf"], ["Funboards", "surf"], ["Surf Shop Surfboards & Equipment Surfboards", "surf"],
    ["Modern Blackbird PU 8'0\" Longboard", "surf"], ["Snowboards", "snow"], ["Jones Solution Splitboard", "snow"], ["Beanie", null],
  ])("sport of %s", (hint, sport) => {
    expect(detectSport(hint)).toBe(sport);
  });
  it.each([
    ["Skateboard Decks", "Anti Hero Classic Eagle 8.5 Skateboard Deck", "deck"],
    ["Skateboard Completes", "Arbor Street 8.0 Skateboard Complete", "complete"],
    ["Cruiser Complete", "Landyachtz Dinghy Cruiser Skateboard Complete", "cruiser"],
    ["Longboard Completes", "Arbor Axis Longboard Complete", "longboard"],
    ["Longboard & Cruiser Longboards", "Pintail 44″ Complete", "longboard"],
    ["", "Flying Wheels Clockwork 31 Surfskate", "cruiser"],
    ["", "Element Off The Charts 7.75 Complete", "complete"],
  ])("skate %s / %s", (tax, title, cat) => {
    expect(classifyCategory("skate", tax, title, "", NO_SPECS)).toBe(cat);
  });
  it.each([
    ["Shortboards", "Lib Tech x Lost Puddle Jumper Surfboard", [175, 180], "shortboard"],
    ["Shortboards", "Saltglass Twin Keel Fish 5'6\"", [168], "fish"],
    ["", "Channel Islands Swallow Tail Twin", [170], "fish"],
    ["Funboards", "Lib Tech Pickup Stick Surfboard", [198, 244], "midlength"],
    ["", "Tidecraft Easy Egg 7'4\"", [224], "midlength"],
    ["", "Torq Mod Fun 7'6", [229], "midlength"],
    ["Longboards", "Modern Blackbird PU 9'0\" Longboard", [274], "longboard-surf"],
    ["", "Old Pier Classic Log 9'2", [279], "longboard-surf"],
    ["", "Bubbleboard Soft Top 8'0", [244], "foamie"],
    ["Funboards", "Catch Surf Odysea 8'0\" Log Surfboard", [244], "foamie"],
    ["", "Light Hybrid Plus 5'10 Surf", [178], "shortboard"],
  ] as const)("surf %s / %s", (tax, title, lens, cat) => {
    expect(classifyCategory("surf", tax, title, "", NO_SPECS, [...lens])).toBe(cat);
  });
  it("snow categories from title, then shape/styles", () => {
    expect(snowCategory("Jones Solution Splitboard", NO_SPECS)).toBe("splitboard");
    expect(snowCategory("Burton Fish 3D", NO_SPECS)).toBe("powder");
    expect(snowCategory("Lib Tech Orca", { ...NO_SPECS, shape: "tapered" })).toBe("powder");
    expect(snowCategory("Capita DOA", { ...NO_SPECS, styles: ["park", "all-mountain"] })).toBe("freestyle");
    expect(snowCategory("Burton Custom", { ...NO_SPECS, styles: ["all-mountain"] })).toBe("all-mountain");
    expect(snowCategory("Mystery", NO_SPECS)).toBe("all-mountain");
  });
  it("every category produced belongs to its sport", () => {
    for (const s of CATEGORIES_BY_SPORT.surf) expect(BoardCategory.safeParse(s).success).toBe(true);
  });
});

describe("non-board gear is excluded", () => {
  it.each([
    "Independent Stage 11 Skateboard Trucks", "Spitfire Formula Four 54mm Skateboard Wheels", "Bones Reds Bearings", "Jessup Griptape",
    "Mob Grip Tape Sheet", "Pro-Tec Classic Skate Helmet", "Triple 8 Saver Series Pad Set", "O'Neill Hyperfreak 4/3 Wetsuit",
    "FCS II Performer Tri Fin Set", "Futures Fins Surfboard Fins", "Creatures of Leisure Pro 6' Surf Leash", "Dakine Traction Pad",
    "Pro-Lite Session Day Surfboard Bag", "Dakine 6ft Board Sock", "Sex Wax Quick Humps", "Arbor Street 7.75 Skateboard Complete + Triple 8 Helmet",
    "Lib Tech Pickup Stick 7'6\" Surfboard - Used", "Lib Tech x Lost Rocket Redux Surfboard - Blem", "Landyachtz Bear 852 Trucks", "Orangatang Kegel 80mm Wheels",
  ])("%s", (title) => {
    expect(isSkateSurfGear(title)).toBe(true);
  });
  it.each([
    "Catch Surf Blank Series 6'6\" Fish - Tri Fin Surfboard", "Flying Wheels Clockwork 31 Surfskate", "Softech Mason Twin FCS II 5'10\" Surfboard",
    "Anti Hero Classic Eagle 8.5 Skateboard Deck", "Pintail 44″ Complete", "Catch Surf Odysea Skipper Quad-Fin Surfboard", "Hybrid Plus White - Epoxy - Future 5'10 Surf",
  ])("keeps %s", (title) => {
    expect(isSkateSurfGear(title)).toBe(false);
  });
});

describe("evo skate & surf (Shopify JSON)", () => {
  const base = { body_html: "", tags: [], images: [{ src: "https://cdn.example/1.jpg" }] };
  it("deck: width from the size option, model without width", () => {
    const p = parseShopifyProduct({
      ...base, title: "Anti Hero Classic Eagle 8.38 Skateboard Deck", handle: "anti-hero-eagle-838", vendor: "Anti Hero", product_type: "Skateboard Decks",
      options: [{ name: "Size", position: 1 }],
      variants: [{ title: "8.38 in", price: "76.95", compare_at_price: null, available: true, option1: "8.38 in", option2: null, option3: null }],
    }, "https://www.evo.com", "", "skate")!;
    expect(p).toMatchObject({ sport: "skate", category: "deck", brand: "Anti Hero", model: "Classic Eagle", price: 76.95 });
    expect(p.sizes).toEqual([{ lengthCm: 0, waist: "regular", label: '8.38"', widthIn: 8.38, inStock: true, price: 76.95 }]);
    expect(p.specs).toEqual(NO_SPECS);
  });
  it("surfboard: feet/inch sizes, colour option ignored, blem variant skipped, volume from copy for one-size boards", () => {
    const p = parseShopifyProduct({
      ...base, title: "Lib Tech Pickup Stick Surfboard", handle: "lt-pickup", vendor: "Lib Tech", product_type: "Funboards",
      options: [{ name: "Size", position: 1 }],
      variants: [
        { title: "6'6\"", price: "679.99", compare_at_price: "799.99", available: true, option1: "6'6\"", option2: null, option3: null },
        { title: "8'0\"", price: "699.99", compare_at_price: "799.99", available: false, option1: "8'0\"", option2: null, option3: null },
        { title: "9'0\" B Grade", price: "499.99", compare_at_price: null, available: true, option1: "9'0\" B Grade", option2: null, option3: null },
      ],
    }, "https://www.evo.com", "", "surf")!;
    expect(p).toMatchObject({ sport: "surf", category: "midlength", model: "Pickup Stick", price: 679.99, listPrice: 799.99 });
    expect(p.sizes.map((s) => [s.label, s.lengthCm, s.inStock])).toEqual([[`6'6"`, 198, true], [`8'0"`, 244, false]]);

    const rnf = parseShopifyProduct({
      ...base, title: "Catch Surf Odysea x Lost RNF 5'11\" Surfboard", handle: "cs-rnf", vendor: "Catch Surf", product_type: "Shortboards",
      body_html: "<p>This 48-liter wave magnet combines the iconic RNF outline.</p>",
      options: [{ name: "Color", position: 1 }, { name: "Size", position: 2 }],
      variants: [{ title: "Blue / 5'11\"", price: "399.99", compare_at_price: null, available: true, option1: "Blue", option2: "5'11\"", option3: null }],
    }, "https://www.evo.com", "", "surf")!;
    expect(rnf).toMatchObject({ category: "foamie", model: "Odysea x Lost RNF" });
    expect(rnf.sizes).toMatchObject([{ label: `5'11"`, volumeL: 48 }]);
  });
  it("drops bundles and packages", () => {
    const bundle = {
      ...base, title: "Softech Mason Twin 5'6\" Surfboard + FCS 6' Leash", handle: "pkg", vendor: "Softech", product_type: "Shortboard Packages", tags: ["type:custom-bundle"],
      options: [{ name: "Title", position: 1 }],
      variants: [{ title: "Default Title", price: "399.99", compare_at_price: null, available: true, option1: "Default Title", option2: null, option3: null }],
    };
    expect(parseShopifyProduct(bundle, "https://www.evo.com", "", "surf")).toBeNull();
  });
  it("live re-check without a hint detects the sport from product type", () => {
    const p = parseShopifyProduct({
      ...base, title: "Landyachtz Dinghy Cruiser Skateboard Complete", handle: "ly-dinghy", vendor: "Landyachtz", product_type: "Cruiser Complete",
      options: [{ name: "Size", position: 1 }],
      variants: [{ title: "28.5 in", price: "139", compare_at_price: null, available: true, option1: "28.5 in", option2: null, option3: null }],
    }, "https://www.evo.com", "")!;
    expect(p).toMatchObject({ sport: "skate", category: "cruiser", model: "Dinghy" });
    expect(p.sizes).toMatchObject([{ lengthCm: 72, label: '28.5" long' }]);
  });
});

describe("Blue Tomato skate & surf (JSON-LD + breadcrumbs + feature list)", () => {
  const page = (product: object, crumbs: string[], features: string) => `<html><body>
    <script type="application/ld+json">${JSON.stringify(product)}</script>
    <script type="application/ld+json">${JSON.stringify({ "@type": "BreadcrumbList", itemListElement: crumbs.map((name, i) => ({ "@type": "ListItem", position: i + 1, name })) })}</script>
    <dl class="features">${features}</dl></body></html>`;
  const group = (name: string, brand: string, price: number) => ({
    "@type": "ProductGroup", name, brand: { "@type": "Brand", name: brand },
    hasVariant: [{ "@type": "Product", name, size: { "@type": "SizeSpecification", name: "Uni" }, offers: [{ price, priceCurrency: "EUR", availability: "https://schema.org/InStock" }] }],
  });

  it("longboard complete: width + length from the feature list, category from breadcrumbs", () => {
    const html = page(group("Pintail 44″ Complete", "Globe", 199.95), ["Home", "Skate Shop", "Longboard & Cruiser", "Longboards"],
      "<dt>Width</dt><dd>9.75 inch</dd><dt>Length (inch)</dt><dd>44 inch</dd><dt>Truck Width</dt><dd>180 mm</dd>");
    const crumbs = findBreadcrumbs(html);
    expect(crumbs.at(-1)).toBe("Longboards");
    const p = parseJsonLdProduct(findProductNode(html)!, "https://bt/x", "EUR", "", { sport: "skate", breadcrumbs: crumbs, features: pageFeatures("skate", htmlToText(html)) })!;
    expect(p).toMatchObject({ sport: "skate", category: "longboard", model: "Pintail", price: 199.95 });
    expect(p.sizes).toMatchObject([{ widthIn: 9.75, lengthCm: 112, label: '9.75"' }]);
  });
  it("surfboard: length from title, volume from features", () => {
    const html = page(group("Untitled FF Future 5'9 Surfboard", "Haydenshapes", 869.95), ["Home", "Surf Shop", "Surfboards & Equipment", "Surfboards"],
      "Length 5&#x27;9 ft Width 19.5 inch Thickness 2.375 inch Volume 29.08 liter");
    const p = parseJsonLdProduct(findProductNode(html)!, "https://bt/y", "EUR", "", { breadcrumbs: findBreadcrumbs(html), features: pageFeatures("surf", htmlToText(html)) })!;
    expect(p).toMatchObject({ sport: "surf", category: "shortboard", model: "Untitled FF Future" });
    expect(p.sizes).toMatchObject([{ label: `5'9"`, lengthCm: 175, volumeL: 29.08 }]);
  });
  it("gear under a board URL is rejected via title or breadcrumb", () => {
    const html = page(group("Pro 6' Leash", "Creatures", 39.95), ["Home", "Surf Shop", "Surfboards & Equipment", "Leashes"], "");
    expect(parseJsonLdProduct(findProductNode(html)!, "https://bt/z", "EUR", "", { sport: "surf", breadcrumbs: findBreadcrumbs(html) })).toBeNull();
  });
});

describe("model names & keys", () => {
  it("strip per-variant sizes so sizes of one model merge", () => {
    expect(displayModelFor("skate", "Anti Hero Classic Eagle 8.5 Skateboard Deck", "Anti Hero")).toBe("Classic Eagle");
    expect(displayModelFor("skate", "Santa Cruz Skateboards Classic Dot 8.0 Skateboard Complete", "Santa Cruz Skateboards")).toBe("Classic Dot");
    expect(displayModelFor("surf", "Lib Tech Pickup Stick 7'0\" Surfboard", "Lib Tech")).toBe("Pickup Stick");
    expect(displayModelFor("surf", "NSP Elements HDT Fish 6'4\" Shortboard", "NSP")).toBe("Elements HDT Fish");
    expect(displayModelFor("snow", "Burton Custom Snowboard 2026", "Burton")).toBe("Custom");
  });
  it("sport is part of the key (snow keeps the legacy key)", () => {
    expect(sportBoardKey("snow", "powder", "Lib Tech", "Fish", "2025/26")).toBe("lib tech|fish|2025/26");
    expect(sportBoardKey("surf", "fish", "Lib Tech", "Fish", "2025/26")).toBe("surf|lib tech|fish|2025/26");
    expect(sportBoardKey("skate", "deck", "Arbor", "Street", "2025/26")).not.toBe(sportBoardKey("skate", "complete", "Arbor", "Street", "2025/26"));
  });
});

describe("mock catalog", () => {
  const cat = buildMockCatalog();
  it("has every sport, valid categories, sport-specific sizes", () => {
    for (const sport of ["snow", "skate", "surf"] as const) {
      const bs = cat.boards.filter((b) => b.sport === sport);
      expect(bs.length).toBeGreaterThanOrEqual(6);
      for (const b of bs) expect(CATEGORIES_BY_SPORT[sport]).toContain(b.category);
      expect(new Set(bs.map((b) => b.category)).size).toBe(CATEGORIES_BY_SPORT[sport].length - (sport === "snow" ? 1 : 0));
    }
    const sizesOf = (sport: string) => cat.listings.filter((l) => cat.boards.find((b) => b.id === l.boardId)!.sport === sport).flatMap((l) => l.sizes);
    expect(sizesOf("skate").every((s) => s.widthIn! >= 7.5 && s.widthIn! <= 10)).toBe(true);
    expect(sizesOf("surf").every((s) => s.volumeL! >= 25 && s.volumeL! <= 80)).toBe(true);
  });
  it("buildDeals per sport returns only that sport and its fit", () => {
    const locale = { country: "DE", currency: "EUR" as const, source: "default" as const };
    for (const sport of ["skate", "surf"] as const) {
      const res = buildDeals(cat, locale, rider({ skill: "intermediate", skateStyle: "street" }), sport);
      expect(res.deals.length).toBeGreaterThan(0);
      expect(res.deals.every((d) => d.board.sport === sport)).toBe(true);
      expect(res.fits[sport]).toBeDefined();
    }
    const all = buildDeals(cat, locale, null);
    expect(new Set(all.deals.map((d) => d.board.sport))).toEqual(new Set(["snow", "skate", "surf"]));
  });
});

describe("ingest skate + surf (PGlite)", () => {
  let h: DbHandle;
  const product = (over: Partial<ScrapedProduct>): ScrapedProduct => ({
    url: "https://www.evo.com/products/x", title: "X", sport: "snow", category: null, brand: "Lib Tech", model: "Fish", season: "2025/26", seasonKnown: true,
    price: 500, listPrice: 600, currency: "USD", sizes: [], images: [], specs: NO_SPECS, rating: null, scrapedAt: new Date().toISOString(), ...over,
  });

  beforeAll(async () => {
    h = await openDb("pglite:memory");
    await h.migrate();
    for (const r of Object.values(RETAILERS)) await upsertRetailer(h.db, r);
  });
  afterAll(() => h.close());

  it("stores sport, category, width and volume; same model name in two sports stays two boards", async () => {
    const snow = await ingestProduct(h.db, "evo", product({
      url: "https://www.evo.com/products/lib-tech-fish-snowboard", category: "powder",
      sizes: [{ lengthCm: 156, waist: "regular", label: "156", inStock: true, price: 500 }],
    }));
    const surf = await ingestProduct(h.db, "evo", product({
      url: "https://www.evo.com/products/lib-tech-fish-surfboard", sport: "surf", category: "fish", price: 700,
      sizes: [
        { lengthCm: 168, waist: "regular", label: `5'6"`, inStock: true, price: 700, volumeL: 31.5 },
        { lengthCm: 173, waist: "regular", label: `5'8"`, inStock: false, price: 720 },
      ],
    }));
    const skate = await ingestProduct(h.db, "evo", product({
      url: "https://www.evo.com/products/arbor-street-825", sport: "skate", category: "deck", brand: "Arbor", model: "Street", seasonKnown: false, price: 70, listPrice: null,
      sizes: [{ lengthCm: 0, waist: "regular", label: '8.25"', widthIn: 8.25, inStock: true, price: 70 }],
    }));
    expect(new Set([snow.boardId, surf.boardId, skate.boardId]).size).toBe(3);

    const rows = await h.db.select().from(boards);
    expect(rows.find((b) => b.id === surf.boardId)).toMatchObject({ sport: "surf", category: "fish", key: "surf|lib tech|fish|2025/26" });
    expect(rows.find((b) => b.id === snow.boardId)).toMatchObject({ sport: "snow", category: "powder" });
    expect(rows.find((b) => b.id === skate.boardId)).toMatchObject({ sport: "skate", category: "deck" });

    const sz = await h.db.select().from(listingSizes).where(eq(listingSizes.listingId, skate.listingId));
    expect(sz).toMatchObject([{ label: '8.25"', lengthCm: 0, widthIn: 8.25, volumeL: null }]);

    // Another width of the same deck (separate product page at evo) joins the same board.
    const skate2 = await ingestProduct(h.db, "evo", product({
      url: "https://www.evo.com/products/arbor-street-85", sport: "skate", category: "deck", brand: "Arbor", model: "Street", seasonKnown: false, price: 72, listPrice: null,
      sizes: [{ lengthCm: 0, waist: "regular", label: '8.5"', widthIn: 8.5, inStock: true, price: 72 }],
    }));
    expect(skate2.boardId).toBe(skate.boardId);
  });

  it("round-trips through the repository and the per-sport deal pipeline", async () => {
    const { DbRepository } = await import("@/lib/data/repository");
    const catalog = await new DbRepository(async () => h.db).getCatalog();
    const surfBoard = catalog.boards.find((b) => b.sport === "surf")!;
    expect(surfBoard.category).toBe("fish");
    const surfListing = catalog.listings.find((l) => l.boardId === surfBoard.id)!;
    expect(surfListing.sizes[0]).toMatchObject({ label: `5'6"`, volumeL: 31.5 });
    expect(surfListing.sizes[1].volumeL).toBeUndefined();

    const locale = { country: "US", currency: "USD" as const, source: "override" as const };
    // 70 kg advanced surfer: 70 × 0.39 × 1.08 ≈ 29.5 L (± 3) → the 31.5 L 5'6" fits.
    const surfDeals = buildDeals(catalog, locale, rider({ weightKg: 70, skill: "advanced", waves: "small" }), "surf");
    expect(surfDeals.deals.map((d) => d.matchingSizes.map((m) => m.size.label))).toEqual([[`5'6"`]]);
    const skateDeals = buildDeals(catalog, locale, rider({ bootSize: 10, skateStyle: "transition" }), "skate"); // 8.375" ± 0.25
    expect(skateDeals.deals.length).toBe(2);
    expect(skateDeals.deals.every((d) => d.board.sport === "skate")).toBe(true);
  });
});
