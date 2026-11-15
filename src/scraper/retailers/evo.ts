import type { Retailer, Sport } from "@/lib/types";
import { extractSpecs } from "../parse/specs";
import { buildSizes, headlinePrice, pageFeatures } from "../parse/sizes";
import { displayModelFor, hasModelYear, NOT_A_BOARD, seasonFrom } from "../parse/normalize";
import { classifyCategory, detectSport, isSkateSurfGear, NO_SPECS } from "../parse/sport";
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

/** Bundles ("Surfboard + Leash", "Cruiser + Helmet") and packages are not single boards. */
const isBundle = (p: Pick<ShopifyProduct, "title" | "product_type" | "tags">) =>
  /\bpackages?\b|\bbundles?\b/i.test(p.product_type) || p.tags.some((t) => /custom-bundle/i.test(t)) || /\s\+\s/.test(p.title);

/** "48-liter", "32.5L" in product copy (only used for one-size boards). */
function volumeFromCopy(text: string): { volumeL?: number } {
  const m = text.match(/(?<![\d.])(\d{2,3}(?:[.,]\d{1,2})?)\s*-?\s*(?:liters?|litres?|l)\b/i);
  const v = m ? Number(m[1].replace(",", ".")) : NaN;
  return v >= 15 && v <= 120 ? { volumeL: v } : {};
}

/**
 * One Shopify product → ScrapedProduct. `sportHint` is the collection's sport;
 * without it (live re-check) the sport is read from product type + title.
 */
export function parseShopifyProduct(p: ShopifyProduct, origin: string, scrapedAt: string, sportHint?: Sport): ScrapedProduct | null {
  const sport = sportHint ?? detectSport(`${p.product_type} ${p.title}`) ?? "snow";
  // Kids boards are kept (Kids filter).
  if (sport === "snow" ? NOT_A_BOARD.test(p.title) : isSkateSurfGear(p.title) || isBundle(p)) return null;
  const sizeOpt = p.options.find((o) => /size|length|width/i.test(o.name));
  const pick = (v: ShopifyVariant) => (sizeOpt ? [v.option1, v.option2, v.option3][sizeOpt.position - 1] : v.title) ?? "";
  const body = htmlToText(p.body_html);

  const sizes = buildSizes(
    sport,
    p.variants.map((v) => ({ label: pick(v), inStock: v.available, price: parsePrice(v.price) ?? undefined })),
    p.title,
    sport === "surf" ? { ...volumeFromCopy(body), ...pageFeatures(sport, body) } : {},
  );
  if (!sizes.length) return null;
  const price = headlinePrice(sizes, []);
  if (price === null) return null;
  const compare = p.variants.map((v) => parsePrice(v.compare_at_price)).filter((n): n is number => n !== null && n > 0);
  const text = `${p.title} ${body} ${p.tags.join(" ")}`;
  const specs = sport === "snow" ? extractSpecs(text) : NO_SPECS;

  return {
    url: `${origin}/products/${p.handle}`,
    title: p.title,
    sport,
    category: classifyCategory(sport, p.product_type, p.title, body, specs, sizes.map((s) => s.lengthCm)),
    brand: p.vendor,
    model: displayModelFor(sport, p.title, p.vendor),
    season: seasonFrom(p.title),
    seasonKnown: hasModelYear(p.title),
    price,
    listPrice: compare.length ? Math.max(...compare) : null,
    currency: "USD",
    sizes,
    images: p.images.map((i) => i.src).slice(0, 8),
    specs,
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

/**
 * Collections crawled per sport (handles verified on evo.com, Nov 2026). Skate is
 * split by type so each feed is a clean board list; surf "Packages" (board +
 * leash / rack-pad bundles) and used/blem boards are filtered out in parsing.
 */
export const EVO_COLLECTIONS: ReadonlyArray<{ sport: Sport; handle: string }> = [
  { sport: "snow", handle: "snowboards" },
  { sport: "skate", handle: "skateboard-decks" },
  { sport: "skate", handle: "skateboard-completes" },
  { sport: "skate", handle: "cruiser-skateboards" },
  { sport: "skate", handle: "longboard-skateboard-completes" },
  { sport: "surf", handle: "surfboards" },
];

export function evoAdapter(retailer: Retailer): RetailerAdapter {
  const origin = retailer.homepage.replace(/\/$/, "");
  return {
    retailer,
    sports: [...new Set(EVO_COLLECTIONS.map((c) => c.sport))],
    async fetchOne(http, url) {
      const handleUrl = url.replace(/[?#].*$/, "").replace(/\/$/, "");
      const p = await http.getJson<ShopifyJsProduct>(`${handleUrl}.js`);
      return parseShopifyProduct(fromShopifyJs(p), origin, new Date().toISOString());
    },
    async *crawl(ctx: CrawlContext) {
      const seen = new Set<string>();
      const yielded = new Map<Sport, number>();
      const count = (s: Sport) => yielded.get(s) ?? 0;
      for (const { sport, handle } of EVO_COLLECTIONS) {
        if (ctx.sports && !ctx.sports.includes(sport)) continue;
        for (let page = 1; page <= 40 && count(sport) < ctx.limit; page++) {
          const url = `${origin}/collections/${handle}/products.json?limit=250&page=${page}`;
          const { products } = await ctx.http.getJson<{ products: ShopifyProduct[] }>(url);
          ctx.log(`${handle} page ${page}: ${products.length} products`);
          if (!products.length) break;
          const now = new Date().toISOString();
          for (const p of products) {
            if (seen.has(p.handle)) continue;
            seen.add(p.handle);
            const parsed = parseShopifyProduct(p, origin, now, sport);
            if (parsed && count(sport) < ctx.limit) {
              yielded.set(sport, count(sport) + 1);
              yield parsed;
            }
          }
        }
      }
    },
  };
}
