import type { Retailer } from "@/lib/types";
import { extractSpecs } from "../parse/specs";
import { mergeSizes, headlinePrice, parseSizeLabel } from "../parse/sizes";
import { displayModel, hasModelYear, NOT_A_BOARD, seasonFrom } from "../parse/normalize";
import { htmlToText, parsePrice } from "../parse/text";
import type { CrawlContext, RetailerAdapter, ScrapedProduct } from "../types";

/**
 * evo.com runs on Shopify, which publishes a public, robots-allowed JSON feed per
 * collection. One request = up to 250 products with every variant's price,
 * compare-at (MSRP) price and stock — far lighter on their servers than HTML pages.
 */
interface ShopifyVariant { title: string; price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null }
interface ShopifyProduct {
  title: string; handle: string; body_html: string | null; vendor: string; product_type: string; tags: string[];
  options: { name: string; position: number }[];
  variants: ShopifyVariant[];
  images: { src: string }[];
}

export function parseShopifyProduct(p: ShopifyProduct, origin: string, scrapedAt: string): ScrapedProduct | null {
  if (NOT_A_BOARD.test(p.title)) return null; // kids boards are kept (Kids filter)
  const sizeOpt = p.options.find((o) => /size/i.test(o.name));
  const pick = (v: ShopifyVariant) => (sizeOpt ? [v.option1, v.option2, v.option3][sizeOpt.position - 1] : v.title) ?? "";

  const sizes = mergeSizes(
    p.variants.flatMap((v) => {
      const s = parseSizeLabel(pick(v), v.available, parsePrice(v.price) ?? undefined);
      return s ? [s] : [];
    }),
  );
  if (!sizes.length) return null;
  const price = headlinePrice(sizes, []);
  if (price === null) return null;
  const compare = p.variants.map((v) => parsePrice(v.compare_at_price)).filter((n): n is number => n !== null && n > 0);
  const text = `${p.title} ${htmlToText(p.body_html)} ${p.tags.join(" ")}`;

  return {
    url: `${origin}/products/${p.handle}`,
    title: p.title,
    brand: p.vendor,
    model: displayModel(p.title, p.vendor),
    season: seasonFrom(p.title),
    seasonKnown: hasModelYear(p.title),
    price,
    listPrice: compare.length ? Math.max(...compare) : null,
    currency: "USD",
    sizes,
    images: p.images.map((i) => i.src).slice(0, 8),
    specs: extractSpecs(text),
    rating: null,
    scrapedAt,
  };
}

/** Shopify's per-product `/products/<handle>.js` feed: prices in cents, options as names. */
interface ShopifyJsProduct {
  title: string; handle: string; description?: string; vendor: string; type: string; tags: string[] | string;
  options: Array<string | { name: string; position?: number }>;
  variants: Array<{ title: string; price: number; compare_at_price: number | null; available: boolean; option1: string | null; option2: string | null; option3: string | null }>;
  images: string[];
}

export function fromShopifyJs(p: ShopifyJsProduct): ShopifyProduct {
  const cents = (n: number | null) => (n === null || n === undefined ? null : (n / 100).toFixed(2));
  return {
    title: p.title,
    handle: p.handle,
    body_html: p.description ?? null,
    vendor: p.vendor,
    product_type: p.type,
    tags: Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    options: p.options.map((o, i) => (typeof o === "string" ? { name: o, position: i + 1 } : { name: o.name, position: o.position ?? i + 1 })),
    variants: p.variants.map((v) => ({ ...v, price: cents(v.price) ?? "0", compare_at_price: cents(v.compare_at_price) })),
    images: p.images.map((src) => ({ src: src.startsWith("//") ? `https:${src}` : src })),
  };
}

export function evoAdapter(retailer: Retailer): RetailerAdapter {
  const origin = retailer.homepage.replace(/\/$/, "");
  return {
    retailer,
    async fetchOne(http, url) {
      const handleUrl = url.replace(/[?#].*$/, "").replace(/\/$/, "");
      const p = await http.getJson<ShopifyJsProduct>(`${handleUrl}.js`);
      return parseShopifyProduct(fromShopifyJs(p), origin, new Date().toISOString());
    },
    async *crawl(ctx: CrawlContext) {
      let yielded = 0;
      for (let page = 1; page <= 40 && yielded < ctx.limit; page++) {
        const url = `${origin}/collections/snowboards/products.json?limit=250&page=${page}`;
        const { products } = await ctx.http.getJson<{ products: ShopifyProduct[] }>(url);
        ctx.log(`page ${page}: ${products.length} products`);
        if (!products.length) break;
        const now = new Date().toISOString();
        for (const p of products) {
          const parsed = parseShopifyProduct(p, origin, now);
          if (parsed && yielded < ctx.limit) {
            yielded++;
            yield parsed;
          }
        }
      }
    },
  };
}

