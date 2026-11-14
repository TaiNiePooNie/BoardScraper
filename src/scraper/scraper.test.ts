import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDb, type DbHandle } from "@/db/client";
import { boards, listings, pricePoints } from "@/db/schema";
import { buildDeals } from "@/lib/deals";
import { RETAILERS } from "@/lib/retailers";
import { eq } from "drizzle-orm";
import { boardKey, displayModel, modelKey, seasonFrom } from "./parse/normalize";
import { mergeSizes, parseSizeLabel } from "./parse/sizes";
import { extractSpecs } from "./parse/specs";
import { parsePrice } from "./parse/text";
import { parseShopifyProduct } from "./retailers/evo";
import { findProductNode, ogListPrice, parseJsonLdProduct } from "./retailers/sitemapJsonLd";
import { deactivateMissing, ingestProduct, refreshBoards, upsertRetailer } from "./ingest";
import type { ScrapedProduct } from "./types";

describe("size labels", () => {
  it.each([
    ["156", 156, "regular", "156"],
    ["155W cm", 155, "wide", "155W"],
    ["158 Wide", 158, "wide", "158W"],
    ["159MW", 159, "mid-wide", "159MW"],
    ["Taille 162 W", 162, "wide", "162W"],
  ])("%s", (label, len, waist, norm) => {
    expect(parseSizeLabel(label)).toMatchObject({ lengthCm: len, waist, label: norm });
  });
  it("rejects kids / non-sizes", () => {
    expect(parseSizeLabel("60")).toBeNull();
    expect(parseSizeLabel("100")).toMatchObject({ lengthCm: 100 });
    expect(parseSizeLabel("Uni")).toBeNull();
  });
  it("merges colorways: in stock if any, cheapest in-stock price", () => {
    const m = mergeSizes([
      { lengthCm: 155, waist: "regular", label: "155", inStock: false, price: 300 },
      { lengthCm: 155, waist: "regular", label: "155", inStock: true, price: 350 },
    ]);
    expect(m).toEqual([{ lengthCm: 155, waist: "regular", label: "155", inStock: true, price: 350 }]);
  });
});

describe("normalization", () => {
  it("same board across shop title styles → same key", () => {
    const a = boardKey("Burton", displayModel("Burton Custom Snowboard 2026", "Burton"), seasonFrom("Burton Custom Snowboard 2026"));
    const b = boardKey("Burton Snowboards", displayModel("Custom 2026 Snowboard", "Burton"), seasonFrom("Custom 2026 Snowboard"));
    const c = boardKey("Burton", displayModel("Planche Snowboard Burton Custom 2026".replace(/^planche snowboard /i, ""), "Burton"), "2025/26");
    expect(a).toBe("burton|custom|2025/26");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
  it("keeps women's boards distinct", () => {
    expect(modelKey("Feelgood Women's")).not.toBe(modelKey("Feelgood"));
    expect(modelKey("Women's Feelgood")).toBe(modelKey("Feelgood Womens"));
  });
  it("season from model year", () => {
    expect(seasonFrom("Flagship 2026 Snowboard")).toBe("2025/26");
    expect(seasonFrom("Board 2025/2026")).toBe("2025/26");
    expect(seasonFrom("No year", new Date("2026-11-13"))).toBe("2026/27");
  });
  it("prices", () => {
    expect(parsePrice("€ 1.299,95")).toBe(1299.95);
    expect(parsePrice("$549.99")).toBe(549.99);
    expect(parsePrice("£399")).toBe(399);
  });
});

describe("spec extraction", () => {
  it("EN copy", () => {
    expect(extractSpecs("A true twin with Flying V rocker and a medium-soft flex built for the park.")).toEqual({
      profile: "hybrid-rocker", shape: "true-twin", flex: 4, styles: ["park"],
    });
  });
  it("numeric flex + directional camber + powder", () => {
    const s = extractSpecs("Directional camber, tapered shape. Flex: 8/10. Floats in deep powder.");
    expect(s).toMatchObject({ profile: "directional-camber", shape: "tapered", flex: 8, styles: ["freeride"] });
  });
  it("FR copy", () => {
    const s = extractSpecs("Planche freestyle, shape twin-tip et un profil Reverse Camber, flex souple.");
    expect(s).toMatchObject({ profile: "rocker", shape: "true-twin", flex: 3, styles: ["park"] });
  });
  it("unknown stays null", () => {
    expect(extractSpecs("Great board.")).toEqual({ profile: null, shape: null, flex: null, styles: [] });
  });
});

describe("evo (Shopify JSON)", () => {
  const product = {
    title: "Burton Cultivator Snowboard 2026", handle: "123-burton-cultivator", vendor: "Burton", product_type: "Snowboards", tags: [],
    body_html: "<p>Twin shape with a catch-free <b>Flat Top</b> bend.</p>",
    options: [{ name: "Color", position: 1 }, { name: "Size", position: 2 }],
    variants: [
      { title: "A / 155 cm", price: "349.99", compare_at_price: "429.95", available: false, option1: "A", option2: "155 cm", option3: null },
      { title: "B / 155 cm", price: "384.99", compare_at_price: "429.95", available: true, option1: "B", option2: "155 cm", option3: null },
      { title: "B / 160W cm", price: "384.99", compare_at_price: "429.95", available: true, option1: "B", option2: "160W cm", option3: null },
    ],
    images: [{ src: "https://cdn.example/1.jpg" }],
  };
  it("parses sizes, per-size price, compare-at, specs", () => {
    const p = parseShopifyProduct(product, "https://www.evo.com", "2026-11-13T00:00:00Z")!;
    expect(p).toMatchObject({ brand: "Burton", model: "Cultivator", season: "2025/26", price: 384.99, listPrice: 429.95, currency: "USD" });
    expect(p.sizes.map((s) => s.label)).toEqual(["155", "160W"]);
    expect(p.specs).toMatchObject({ profile: "flat", shape: "true-twin" });
  });
  it("skips non-boards", () => {
    expect(parseShopifyProduct({ ...product, title: "Burton Snowboard Bag" }, "https://www.evo.com", "")).toBeNull();
  });
});

describe("JSON-LD ProductGroup", () => {
  const html = `<html><head><meta property="og:price:standard_amount" content="&quot;729.95&quot;"/>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "ProductGroup", name: "Beast 2026 Snowboard", brand: { "@type": "Brand", name: "Nitro" },
      description: "Directional twin with camber and a stiff flex.",
      aggregateRating: { ratingValue: 4.5, reviewCount: 12 },
      hasVariant: [
        { "@type": "Product", size: { name: "158" }, image: "//img.example/1.jpg", offers: [{ price: 579, priceCurrency: "EUR", availability: "https://schema.org/InStock" }] },
        { "@type": "Product", size: { name: "159W" }, offers: [{ price: 579, priceCurrency: "EUR", availability: "https://schema.org/OutOfStock" }] },
      ],
    })}</script></head></html>`;
  it("parses variants, rating, specs; RRP from og meta", () => {
    const node = findProductNode(html)!;
    const p = parseJsonLdProduct(node, "https://shop/x", "EUR", "")!;
    expect(p).toMatchObject({ brand: "Nitro", model: "Beast", price: 579, rating: { average: 4.5, count: 12 } });
    expect(p.sizes).toEqual([
      { lengthCm: 158, waist: "regular", label: "158", inStock: true, price: 579 },
      { lengthCm: 159, waist: "wide", label: "159W", inStock: false, price: 579 },
    ]);
    expect(p.images).toEqual(["https://img.example/1.jpg"]);
    expect(p.specs).toMatchObject({ profile: "camber", shape: "directional-twin", flex: 8 });
    expect(ogListPrice(html)).toBe(729.95);
  });
});

describe("ingest (PGlite)", () => {
  let h: DbHandle;
  const product = (over: Partial<ScrapedProduct> = {}): ScrapedProduct => ({
    url: "https://www.glisshop.com/planche-de-snowboard/nitro/beast1", title: "Beast", brand: "Nitro", model: "Beast", season: "2026/27", seasonKnown: false,
    price: 400, listPrice: 600, currency: "EUR",
    sizes: [{ lengthCm: 158, waist: "regular", label: "158", inStock: true, price: 400 }, { lengthCm: 159, waist: "wide", label: "159W", inStock: true, price: 420 }],
    images: [], specs: { profile: null, shape: null, flex: null, styles: [] }, rating: null, scrapedAt: new Date().toISOString(), ...over,
  });

  beforeAll(async () => {
    h = await openDb("pglite:memory");
    await h.migrate();
    for (const r of Object.values(RETAILERS)) await upsertRetailer(h.db, r);
  });
  afterAll(() => h.close());

  it("merges a yearless listing into the known season and keeps the first spec", async () => {
    const bt = await ingestProduct(h.db, "blue-tomato", product({
      url: "https://www.blue-tomato.com/en-NL/product/Nitro-Beast+2026+Snowboard-1/", title: "Beast 2026 Snowboard", season: "2025/26", seasonKnown: true,
      price: 579, listPrice: 729.95, specs: { profile: "camber", shape: null, flex: 8, styles: ["freeride"] },
    }));
    const gs = await ingestProduct(h.db, "glisshop", product({ specs: { profile: "rocker", shape: "directional-twin", flex: 3, styles: [] } }));
    expect(gs.boardId).toBe(bt.boardId);
    const [b] = await h.db.select().from(boards).where(eq(boards.id, bt.boardId));
    expect(b).toMatchObject({ season: "2025/26", profile: "camber", flex: 8, shape: "directional-twin", styles: ["freeride"] });
  });

  it("one price point per day, keeps the lowest; grades listings", async () => {
    const { listingId, boardId } = await ingestProduct(h.db, "glisshop", product({ price: 380 }));
    await ingestProduct(h.db, "glisshop", product({ price: 410 }));
    const pts = await h.db.select().from(pricePoints).where(eq(pricePoints.listingId, listingId));
    expect(pts).toHaveLength(1);
    expect(pts[0].price).toBe(380);
    await refreshBoards(h.db, [boardId]);
    const [l] = await h.db.select().from(listings).where(eq(listings.id, listingId));
    expect(l.tier).not.toBeNull();
    const [b] = await h.db.select().from(boards).where(eq(boards.id, boardId));
    expect(b.msrpAmount).toBe(729.95);
  });

  it("feeds the deal pipeline, honouring per-size price and the wide rule", async () => {
    const { DbRepository } = await import("@/lib/data/repository");
    const catalog = await new DbRepository(async () => h.db).getCatalog();
    const res = buildDeals(catalog, { country: "FR", currency: "EUR", source: "override" },
      { weightKg: 85, heightCm: 186, bootSize: 46, bootSystem: "EU", style: "freeride" });
    const gs = res.deals.find((d) => d.retailer.id === "glisshop")!;
    expect(gs.matchingSizes.map((m) => m.size.label)).toEqual(["159W"]);
    expect(gs.listing.price.amount).toBe(420);
  });

  it("does not deactivate on a partial run", async () => {
    expect(await deactivateMissing(h.db, "glisshop", [])).toBe(0);
  });
});
