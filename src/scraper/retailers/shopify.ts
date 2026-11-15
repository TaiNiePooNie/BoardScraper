import { CurrencyCode, type Retailer, type Sport } from "@/lib/types";
import { BlockedError } from "../http";
import { extractSpecs } from "../parse/specs";
import { buildSizes, headlinePrice, pageFeatures } from "../parse/sizes";
import { displayModelFor, hasModelYear, NOT_A_BOARD, seasonFrom } from "../parse/normalize";
import { classifyCategory, classifyShopifySport, detectSport, isSkateSurfGear, NO_SPECS, type ShopifyClassifyOptions } from "../parse/sport";
import { htmlToText, parsePrice } from "../parse/text";
import type { CrawlContext, RetailerAdapter, ScrapedProduct } from "../types";

/**
 * Generic adapter for Shopify shops and brand stores. Shopify publishes a public
 * JSON feed (`/products.json`, `/collections/<handle>/products.json`): one request =
 * up to 250 products with every variant's price, compare-at (MSRP) price and stock —
 * far lighter on the shop than HTML pages. Prices are in the shop's base currency.
 */
export interface ShopifyVariant { title: string; price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null }
export interface ShopifyProduct {
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
/** Board-like products we don't compare: bags, wake/kite/foil/skim boards, used stock, footwear. */
export const NOT_OUR_BOARDS = /board ?bags?|\bbagpacks?\b|\bwake\w*|\bkite\w*|\bfoil(?:board)?s?\b|\bskim\w*|\bpre[- ]?loved\b|\bsecond[- ]?hand\b|\bshoes?\b|\bsneakers?\b|\bfootwear\b|\bsup\b|\bstand ?up paddle/i;

export function parseShopifyProduct(p: ShopifyProduct, origin: string, scrapedAt: string, sportHint?: Sport, currency: CurrencyCode = "USD"): ScrapedProduct | null {
  const sport = sportHint ?? detectSport(`${p.product_type} ${p.title}`) ?? "snow";
  // Kids boards are kept (Kids filter).
  if (sport === "snow" ? NOT_A_BOARD.test(p.title) || isBundle(p) : isSkateSurfGear(p.title) || isBundle(p)) return null;
  if (NOT_OUR_BOARDS.test(p.title) || NOT_OUR_BOARDS.test(p.product_type)) return null;
  const sizeOpt = p.options.find((o) => /size|length|width|taille|größe|grösse|サイズ/i.test(o.name));
  const pick = (v: ShopifyVariant) => (sizeOpt ? [v.option1, v.option2, v.option3][sizeOpt.position - 1] : v.title) ?? "";
  const body = htmlToText(p.body_html);

  const sizes = buildSizes(
    sport,
    p.variants.map((v) => ({ label: pick(v), inStock: v.available, price: parsePrice(v.price) ?? undefined })),
    p.title,
    sport === "surf" ? { ...volumeFromCopy(body), ...pageFeatures(sport, body) } : {},
  );
  if (!sizes.length) return null;
  // Whole-number "widths" 9, 10, 11… are shoe sizes (e.g. a sneaker called "Authentic Deck").
  if (sport === "skate" && sizes.length > 1 && sizes.every((z) => z.widthIn !== undefined && Number.isInteger(z.widthIn) && z.widthIn >= 9)) return null;
  const price = headlinePrice(sizes, []);
  if (price === null) return null;
  const compare = p.variants.map((v) => parsePrice(v.compare_at_price)).filter((n): n is number => n !== null && n >= price);
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
    currency,
    sizes,
    images: p.images.map((i) => (i.src.startsWith("//") ? `https:${i.src}` : i.src)).slice(0, 8),
    specs,
    rating: null,
    scrapedAt,
  };
}

/** Shopify's per-product `/products/<handle>.js` feed: prices in cents, options as names. */
export interface ShopifyJsProduct {
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

export interface ShopifyConfig extends Omit<ShopifyClassifyOptions, "sports"> {
  retailer: Retailer;
  /**
   * Board collections per sport. When given, only these feeds are crawled and the
   * collection decides the sport. When omitted, the whole catalogue (`/products.json`)
   * is paginated and each product is classified from product_type / title / tags.
   */
  collections?: ReadonlyArray<{ sport: Sport; handle: string }>;
  /** Sports the shop is crawled for (catalogue mode; default: all three). */
  sports?: readonly Sport[];
  /** Page cap per feed (250 products per page). */
  maxPages?: number;
  /** Shop-specific clean-up before parsing (titles with SKU codes, vendor spelled "Brand USA"…). */
  rewrite?: (p: ShopifyProduct) => ShopifyProduct;
}

const ALL_SPORTS: readonly Sport[] = ["snow", "skate", "surf"];

/** A catalogue product → board (with its sport) or null, without fetching anything. */
export function shopifyBoard(p: ShopifyProduct, origin: string, scrapedAt: string, currency: CurrencyCode, opts: ShopifyClassifyOptions = {}): ScrapedProduct | null {
  const sport = classifyShopifySport(p, opts);
  return sport ? parseShopifyProduct(p, origin, scrapedAt, sport, currency) : null;
}

export function shopifyAdapter(cfg: ShopifyConfig): RetailerAdapter {
  const { retailer } = cfg;
  const origin = retailer.homepage.replace(/\/$/, "");
  const sports = cfg.collections ? [...new Set(cfg.collections.map((c) => c.sport))] : (cfg.sports ?? ALL_SPORTS);
  const classify: ShopifyClassifyOptions = { productTypes: cfg.productTypes, defaultSport: cfg.defaultSport, sports };
  const maxPages = cfg.maxPages ?? (cfg.collections ? 40 : 120);
  const retitle = (p: ShopifyProduct): ShopifyProduct => (cfg.rewrite ? cfg.rewrite(p) : p);

  /** The feed's prices are in the shop's base currency: confirm it against `/meta.json` once per crawl. */
  async function shopCurrency(ctx: CrawlContext): Promise<CurrencyCode> {
    try {
      const meta = await ctx.http.getJson<{ currency?: string }>(`${origin}/meta.json`);
      const c = CurrencyCode.safeParse(meta.currency);
      if (c.success && c.data !== retailer.currency) {
        ctx.log(`⚠ shop currency is ${c.data}, config says ${retailer.currency} — using ${c.data}`);
        return c.data;
      }
      if (meta.currency && !c.success) ctx.log(`⚠ unsupported shop currency ${meta.currency}; using ${retailer.currency}`);
    } catch (e) {
      if (e instanceof BlockedError) throw e;
    }
    return retailer.currency;
  }

  return {
    retailer,
    sports,
    async fetchOne(http, url) {
      const handleUrl = url.replace(/[?#].*$/, "").replace(/\/$/, "");
      const p = retitle(fromShopifyJs(await http.getJson<ShopifyJsProduct>(`${handleUrl}.js`)));
      const now = new Date().toISOString();
      return shopifyBoard(p, origin, now, retailer.currency, classify) ?? parseShopifyProduct(p, origin, now, undefined, retailer.currency);
    },
    async *crawl(ctx: CrawlContext) {
      const want = ctx.sports ? sports.filter((s) => ctx.sports!.includes(s)) : sports;
      const currency = await shopCurrency(ctx);
      const seen = new Set<string>();
      const yielded = new Map<Sport, number>();
      const count = (s: Sport) => yielded.get(s) ?? 0;
      const done = () => want.every((s) => count(s) >= ctx.limit);
      const feeds = cfg.collections
        ? cfg.collections.filter((c) => want.includes(c.sport)).map((c) => ({ sport: c.sport as Sport | undefined, path: `/collections/${c.handle}/products.json`, label: c.handle }))
        : [{ sport: undefined, path: "/products.json", label: "catalogue" }];

      for (const feed of feeds) {
        for (let page = 1; page <= maxPages && !done() && (!feed.sport || count(feed.sport) < ctx.limit); page++) {
          const { products } = await ctx.http.getJson<{ products: ShopifyProduct[] }>(`${origin}${feed.path}?limit=250&page=${page}`);
          ctx.log(`${feed.label} page ${page}: ${products.length} products`);
          if (!products.length) break;
          const now = new Date().toISOString();
          for (const raw of products) {
            const p = retitle(raw);
            if (seen.has(p.handle)) continue;
            seen.add(p.handle);
            const parsed = feed.sport
              ? parseShopifyProduct(p, origin, now, feed.sport, currency)
              : shopifyBoard(p, origin, now, currency, { ...classify, sports: want });
            if (parsed && count(parsed.sport) < ctx.limit) {
              yielded.set(parsed.sport, count(parsed.sport) + 1);
              yield parsed;
            }
          }
        }
      }
    },
  };
}
