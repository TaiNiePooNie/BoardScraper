import { describe, expect, it } from "vitest";
import type { Retailer } from "@/lib/types";
import type { PoliteFetcher } from "./http";
import { classifyShopifySport } from "./parse/sport";
import { shopifyAdapter, shopifyBoard, type ShopifyProduct } from "./retailers/shopify";
import type { ScrapedProduct } from "./types";
import fixture from "./__fixtures__/shopify-products.json";

const products = fixture.products as ShopifyProduct[];
const shop: Retailer = {
  id: "test-shop", name: "Test Shop", homepage: "https://shop.example", country: "AU", currency: "AUD", pricesIncludeVat: true,
  shipping: [{ destinations: ["AU"], cost: 0, etaDays: [2, 5] }],
};

/** Fake fetcher: serves the fixture as page 1 of any products feed, empty pages after, and a meta.json. */
function fakeHttp(currency = "AUD") {
  const urls: string[] = [];
  const http = {
    async getJson(url: string) {
      urls.push(url);
      if (url.endsWith("/meta.json")) return { currency };
      return { products: /[?&]page=1\b/.test(url) ? products : [] };
    },
  } as unknown as PoliteFetcher;
  return { http, urls };
}

async function crawlAll(adapter: ReturnType<typeof shopifyAdapter>, http: PoliteFetcher, limit = Infinity, sports?: ("snow" | "skate" | "surf")[]) {
  const out: ScrapedProduct[] = [];
  for await (const p of adapter.crawl({ http, limit, log: () => {}, sports })) out.push(p);
  return out;
}

describe("Shopify product_type → sport / gear filter", () => {
  it.each([
    ["Snowboards", "snow"], ["Snowboard", "snow"], ["Splitboards", "snow"], ["Mens Snowboards", "snow"],
    ["Decks", "skate"], ["Skateboard Decks", "skate"], ["Complete Skateboards", "skate"], ["Completes", "skate"], ["Cruisers", "skate"],
    ["Surfskates", "skate"], ["Longboard Completes", "skate"],
    ["Surfboards", "surf"], ["Surfboard", "surf"], ["Softboards", "surf"], ["Shortboards", "surf"], ["Mid Lengths", "surf"], ["Funboards", "surf"],
  ])("%s → %s", (type, sport) => {
    expect(classifyShopifySport({ product_type: type, tags: [], title: "Model X" })).toBe(sport);
  });
  it.each([
    "Snowboard Bindings", "Bindings", "Snowboard Boots", "Snowboard Packages", "Snowboard & Binding Packages", "Splitboard Skins",
    "Ski and Snowboard Helmets", "Goggles", "Snowboard Jackets", "Stomp Pads", "Snowboard Bags",
    "Trucks", "Skateboard Wheels", "Bearings", "Griptape", "Hardware", "Skate Tools", "Protective Gear",
    "Fins", "Surfboard Fins", "Leashes", "Traction Pads", "Wetsuits", "Surf Wax", "Board Bags", "Surf Racks",
    "T-Shirts", "Hoodies", "Hats", "Accessories", "Gift Card", "Stickers", "Socks", "Apparel",
  ])("rejects %s", (type) => {
    expect(classifyShopifySport({ product_type: type, tags: ["snowboard"], title: "Burton Custom Snowboard" })).toBeNull();
  });
  it("falls back to title, then tags (never when a tag names gear)", () => {
    expect(classifyShopifySport({ product_type: "", tags: [], title: "Ghost Surfboard" })).toBe("surf");
    expect(classifyShopifySport({ product_type: "", tags: ["Snowboards", "Mens"], title: "Flagship" })).toBe("snow");
    expect(classifyShopifySport({ product_type: "", tags: ["surf", "wetsuit"], title: "Hyperfreak 4/3" })).toBeNull();
  });
  it("brand-store overrides: product_type map and default sport", () => {
    expect(classifyShopifySport({ product_type: "Boards", tags: [], title: "Flagship" })).toBeNull();
    expect(classifyShopifySport({ product_type: "Boards", tags: [], title: "Flagship" }, { defaultSport: "snow" })).toBe("snow");
    expect(classifyShopifySport({ product_type: "", tags: [], title: "Flagship" }, { defaultSport: "snow" })).toBe("snow");
    expect(classifyShopifySport({ product_type: "Bindings", tags: [], title: "Apollo" }, { defaultSport: "snow" })).toBeNull();
    expect(classifyShopifySport({ product_type: "Hard Goods", tags: [], title: "Ghost" }, { productTypes: { surf: /hard goods/i } })).toBe("surf");
    expect(classifyShopifySport({ product_type: "Surfboards", tags: [], title: "Ghost" }, { sports: ["snow"] })).toBeNull();
  });
});

describe("generic Shopify adapter (fixture catalogue)", () => {
  it("catalogue mode keeps only boards, classifies sport + category, uses the shop currency", async () => {
    const { http, urls } = fakeHttp();
    const got = await crawlAll(shopifyAdapter({ retailer: shop }), http);
    expect(got.map((p) => [p.sport, p.category, p.brand, p.model])).toEqual([
      ["snow", "powder", "Jones", "Mountain Twin"],
      ["snow", "splitboard", "Jones", "Hovercraft 2.0 Splitboard"],
      ["skate", "deck", "Santa Cruz", "Classic Dot"],
      ["skate", "complete", "Santa Cruz", "Classic Dot"],
      ["surf", "shortboard", "Pyzel", "Ghost"],
      ["surf", "foamie", "Lost", "Puddle Jumper Softboard"],
    ]);
    const twin = got[0];
    expect(twin).toMatchObject({ price: 479.95, listPrice: 599.95, currency: "AUD", url: "https://shop.example/products/mountain-twin-2026", season: "2025/26" });
    expect(twin.sizes.map((s) => [s.label, s.inStock])).toEqual([["154", true], ["157", false], ["158W", true]]);
    expect(twin.images[0]).toBe("https://cdn.shopify.com/s/files/mountain-twin-2026.jpg");
    expect(got[4].sizes.map((s) => [s.label, s.inStock])).toEqual([[`6'0"`, true], [`6'2"`, false]]);
    expect(got[2].sizes).toMatchObject([{ widthIn: 8.25 }]);
    // Currency check, then pages until an empty one (Shopify can return < 250 on a non-final page).
    expect(urls).toEqual(["https://shop.example/meta.json", "https://shop.example/products.json?limit=250&page=1", "https://shop.example/products.json?limit=250&page=2"]);
  });

  it("per-sport limit and sport filter", async () => {
    const got = await crawlAll(shopifyAdapter({ retailer: shop }), fakeHttp().http, 1, ["snow", "surf"]);
    expect(got.map((p) => p.sport)).toEqual(["snow", "surf"]);
  });

  it("the shop's real base currency (meta.json) wins over the config", async () => {
    const got = await crawlAll(shopifyAdapter({ retailer: shop, sports: ["snow"] }), fakeHttp("USD").http);
    expect(got.every((p) => p.currency === "USD")).toBe(true);
  });

  it("collection mode: the collection decides the sport and only its feed is fetched", async () => {
    const { http, urls } = fakeHttp();
    const adapter = shopifyAdapter({ retailer: shop, collections: [{ sport: "surf", handle: "surfboards" }] });
    expect(adapter.sports).toEqual(["surf"]);
    const got = await crawlAll(adapter, http, 2);
    expect(got.every((p) => p.sport === "surf")).toBe(true);
    expect(urls[1]).toBe("https://shop.example/collections/surfboards/products.json?limit=250&page=1");
  });

  it("brand store with untyped products", () => {
    const p = { ...products[0], product_type: "", tags: [], title: "Flagship Pro" };
    expect(shopifyBoard(p, "https://brand.example", "", "USD")).toBeNull();
    expect(shopifyBoard(p, "https://brand.example", "", "USD", { defaultSport: "snow" })).toMatchObject({ sport: "snow", model: "Flagship Pro", currency: "USD" });
  });
});
