import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MORE_RETAILERS, NOT_ADDED } from "@/lib/retailers-more";
import { RETAILERS } from "@/lib/retailers";
import { Retailer } from "@/lib/types";
import type { PoliteFetcher } from "./http";
import { ADAPTERS } from "./retailers";
import { nhsTitle, pukasTitle, remodel, unshout } from "./retailers/more";
import { ogProductNode } from "./retailers/sitemapJsonLd";
import type { ScrapedProduct } from "./types";

const FIX = path.join(__dirname, "__fixtures__/more");
const page = (name: string) => readFileSync(path.join(FIX, name), "utf8");

/** Parse one captured page with a retailer's adapter (live re-check path, no network). */
async function parse(id: string, file: string): Promise<ScrapedProduct | null> {
  const text = page(file);
  const url = text.match(/^<!-- (\S+) -->/)![1];
  const http = { get: async () => ({ status: 200, url, text }) } as unknown as PoliteFetcher;
  return ADAPTERS[id].fetchOne(http, url);
}

const sizes = (p: ScrapedProduct | null) => p?.sizes.map((s) => `${s.label}${s.inStock ? "" : "✗"}`);

/** Serve a Shopify fixture as page 1 of every feed. */
async function crawlShopify(id: string, file: string) {
  const body = JSON.parse(page(file));
  const urls: string[] = [];
  const http = {
    async getJson(u: string) {
      urls.push(u);
      if (u.endsWith("/meta.json")) return {};
      return /[?&]page=1\b/.test(u) ? body : { products: [] };
    },
  } as unknown as PoliteFetcher;
  const out: ScrapedProduct[] = [];
  for await (const p of ADAPTERS[id].crawl({ http, limit: 50, log: () => {} })) out.push(p);
  return { out, urls };
}

describe("retailers-more config", () => {
  it("every retailer is valid, registered and has an adapter", () => {
    for (const r of MORE_RETAILERS) {
      expect(() => Retailer.parse(r)).not.toThrow();
      expect(RETAILERS[r.id]).toBe(r);
      expect(ADAPTERS[r.id]?.retailer).toBe(r);
    }
    expect(MORE_RETAILERS).toHaveLength(13);
    expect(Object.keys(NOT_ADDED).sort()).toEqual(["chilli", "ogasaka", "slimes", "xdubai"]);
  });
});

describe("Absolute-Snow (JSON-LD + size radios)", () => {
  it("reads sizes from the page, RRP from the was-price block and the model year from the URL", async () => {
    const p = await parse("absolute-snow-uk", "absolute-snow-sale.html");
    expect(p).toMatchObject({ sport: "snow", brand: "Endeavor", model: "Alpha", price: 249.95, listPrice: 650, currency: "GBP", season: "2020/21", seasonKnown: true });
    expect(sizes(p)).toEqual(["154"]);
  });
  it("keeps wide sizes and drops style descriptors from the model", async () => {
    const p = await parse("absolute-snow-uk", "absolute-snow-wide.html");
    expect(p).toMatchObject({ brand: "Salomon", model: "Craft", listPrice: null, season: "2026/27" });
    expect(sizes(p)).toEqual(["150", "153", "155", "157W", "158", "160W", "162W"]);
    expect(p!.sizes.find((s) => s.label === "157W")?.waist).toBe("wide");
  });
});

describe("City Beach (SFCC JSON-LD)", () => {
  it("parses a complete with its struck-through list price", async () => {
    const p = await parse("city-beach", "city-beach-sale.html");
    expect(p).toMatchObject({ sport: "skate", category: "complete", brand: "Santa Cruz", model: "Classic Dot Mid", price: 169.99, listPrice: 199.99, currency: "AUD" });
    expect(sizes(p)).toEqual(['7.8"']);
  });
  it("drops a toy that only mentions a surfboard", async () => {
    expect(await parse("city-beach", "city-beach-toy.html")).toBeNull();
  });
});

describe("Zumiez / Powell-Peralta / SkateHut / Sickboards (JSON-LD, one size per page)", () => {
  it("zumiez: deck width from the title, brand prefix removed even when spelled differently", async () => {
    const p = await parse("zumiez", "zumiez-deck.html");
    expect(p).toMatchObject({ sport: "skate", category: "deck", brand: "Opera Skateboards", model: "Evil Eye Pop Slick Twin", price: 74.95, currency: "USD" });
    expect(sizes(p)).toEqual(['8.25"']);
  });
  it("powell-peralta: width × length from the title, out of stock", async () => {
    const p = await parse("powell-peralta", "powell-deck.html");
    expect(p).toMatchObject({ category: "deck", brand: "Powell Peralta", price: 49.95 });
    expect(p!.model).not.toMatch(/powell/i);
    expect(p!.sizes[0]).toMatchObject({ widthIn: 8.25, lengthCm: 81, inStock: false });
  });
  it("skatehut: picks the full Product node (with brand) and reads 28'' as a cruiser length", async () => {
    const p = await parse("skatehut", "skatehut-cruiser.html");
    expect(p).toMatchObject({ category: "cruiser", brand: "D-Street", price: 74.95, currency: "GBP", model: "Atlas Complete Cruiser - Blue" });
    expect(p!.sizes[0]).toMatchObject({ lengthCm: 71, inStock: false });
    const c = await parse("skatehut", "skatehut-complete.html");
    expect(c).toMatchObject({ category: "complete", brand: "Girl", price: 69.95 });
    expect(sizes(c)).toEqual(['7.875"']);
  });
  it("skatedeluxe: colourway in brackets is not part of the model", async () => {
    const p = await parse("skatedeluxe", "skatedeluxe-deck.html");
    expect(p).toMatchObject({ category: "deck", brand: "Welcome", model: "x Batman Talons", price: 119.99, currency: "EUR" });
    expect(sizes(p)).toEqual(['9.85"']);
  });
  it("sickboards: PrestaShop JSON-LD", async () => {
    const p = await parse("sickboards", "sickboards-deck.html");
    expect(p).toMatchObject({ category: "deck", brand: "Santa Cruz", model: "Natas Shattered Panther VX", price: 119.95, currency: "EUR" });
    expect(sizes(p)).toEqual(['9"']);
  });
});

describe("SoCal Skateshop (Open Graph product meta)", () => {
  it("builds the product from og/product meta and moves the leading size to the end", async () => {
    const p = await parse("socal-skateshop", "socal-deck.html");
    expect(p).toMatchObject({ sport: "skate", category: "deck", brand: "Anti-Hero", price: 79.95, currency: "USD" });
    expect(p!.title).toMatch(/^Antihero Classic Eagle Deck.*7\.81x31\.3$/);
    expect(p!.model).toBe("Classic Eagle Deck - Kelly Green");
    expect(p!.sizes[0]).toMatchObject({ widthIn: 7.81, inStock: true });
    const oos = await parse("socal-skateshop", "socal-oos.html");
    expect(oos!.sizes[0].inStock).toBe(false);
  });
  it("ogProductNode needs a title and a price", () => {
    expect(ogProductNode('<meta property="og:title" content="X">')).toBeNull();
  });
});

describe("boardsports.eu (Shopware: OG + microdata + configurator)", () => {
  it("reads sizes with stock, RRP and title-cases shouting titles", async () => {
    const p = await parse("boardsports-eu", "boardsports-split.html");
    expect(p).toMatchObject({ sport: "snow", category: "splitboard", brand: "Jones", price: 1344.99, listPrice: 1600, currency: "EUR", season: "2023/24" });
    expect(p!.title).toBe("Jones Ultralight Solution Splitboard 2024");
    expect(sizes(p)).toEqual(["158", "161", "162W", "164", "165W"]);
    const s = await parse("boardsports-eu", "boardsports-snow.html");
    expect(s).toMatchObject({ brand: "Lib Tech", price: 1299.99, listPrice: null });
    expect(sizes(s)).toEqual(["153✗", "156", "159"]);
  });
});

describe("Shopify stores", () => {
  it("yonex: snowboards collection, vendor + title cleaned", async () => {
    const { out, urls } = await crawlShopify("yonex", "yonex.json");
    expect(urls.some((u) => u.includes("/collections/snowboards/products.json"))).toBe(true);
    expect(out.map((p) => [p.brand, p.model, sizes(p)])).toEqual([
      ["Yonex", "Sleek - 30th Anniversary", ["142", "146✗"]],
      ["Yonex", "Smooth - 30th Anniversary", ["154W", "158W✗"]],
    ]);
  });
  it("pukas: one product per board → model + length + volume", async () => {
    const { out } = await crawlShopify("pukas-shop", "pukas.json");
    expect(out.map((p) => [p.brand, p.model, sizes(p), p.sizes[0].volumeL])).toEqual([
      ["Pukas", "Solid Mood", ['6\'1"'], 30.2],
      ["Pukas", "Pegaso", ['5\'6"'], 29.66],
      ["Pukas", "Lotus", ['6\'4"'], 37.4],
    ]);
    expect(pukasTitle("Pukas Surfboards - PEGASO by Chris Christenson - FUT - 5'8” x 19 1/4 x 2 1/2 - 32,01L - PC00999")).toBe("Pegaso 5'8” 32,01L");
  });
  it("skatemenu: catalogue mode, skate only", async () => {
    const { out } = await crawlShopify("skatemenu", "skatemenu.json");
    expect(out.map((p) => [p.brand, p.category, sizes(p)])).toEqual([
      ["Yow", "cruiser", ['34" long']],
      ["Yow", "cruiser", ['34" long']],
      ["Jart", "deck", ['8.5"']],
      ["Tricks", "complete", ['8.25"✗']],
    ]);
  });
  it("nhs (Santa Cruz): deck prints, stickers and jewellery are not boards", async () => {
    const { out, urls } = await crawlShopify("nhs-santa-cruz", "nhs.json");
    expect(urls.some((u) => u.includes("/products.json?limit=250&page=1"))).toBe(true);
    expect(out).toEqual([]);
  });
  it("nhs: size moved to the end and the brand out of the title", () => {
    expect(nhsTitle("8.25in x 31.8in Screaming Hand Santa Cruz Skateboard Deck", "Santa Cruz")).toBe("Screaming Hand Skateboard Deck 8.25in x 31.8in");
    expect(nhsTitle("Classic Dot Necklace", "Santa Cruz")).toBe("Classic Dot Necklace");
  });
});

describe("helpers", () => {
  it("unshout only touches all-caps text", () => {
    expect(unshout("LIB TECH T.RICE ORCA")).toBe("Lib Tech T.rice Orca");
    expect(unshout("Lib Tech")).toBe("Lib Tech");
  });
  it("remodel strips a differently spelled brand prefix", () => {
    const p = { sport: "skate", title: "Santa Cruz Winkowski Dope Planet VX 8.80\" Skateboard Deck", brand: "Santa Cruz Skate", model: "x" } as ScrapedProduct;
    expect(remodel(p).model).toBe("Winkowski Dope Planet VX");
  });
});
