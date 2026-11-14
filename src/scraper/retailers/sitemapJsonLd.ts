import type { CurrencyCode, Retailer } from "@/lib/types";
import { BlockedError, sitemapLocs } from "../http";
import { displayModel, hasModelYear, NOT_A_BOARD, seasonFrom } from "../parse/normalize";
import { headlinePrice, mergeSizes, parseSizeLabel } from "../parse/sizes";
import { extractSpecs } from "../parse/specs";
import { htmlToText, parsePrice } from "../parse/text";
import type { CrawlContext, RetailerAdapter, ScrapedProduct } from "../types";

/**
 * Generic adapter: discover product URLs from the retailer's sitemaps (the crawl
 * path robots.txt advertises), then parse the schema.org Product / ProductGroup
 * JSON-LD each product page embeds for search engines.
 */
export interface SitemapJsonLdConfig {
  retailer: Retailer;
  /** Sitemap(s) or sitemap indexes to start from. */
  sitemaps: string[];
  /** Which sitemap children to follow when given an index. */
  followSitemap?: RegExp;
  /** Which <loc> URLs are snowboard product pages. */
  productUrl: RegExp;
  /** Optional rewrite before fetching (e.g. switch locale path). */
  rewriteUrl?: (url: string) => string;
  /** Strip a product-type prefix from titles, e.g. "Planche Snowboard". */
  titlePrefix?: RegExp;
  /** Retailer-specific RRP extraction when JSON-LD has no list price. */
  listPriceFromHtml?: (html: string, price: number) => number | null;
}

/** Open Graph product price meta many shops emit: og:price:standard_amount / product:original_price:amount. */
export function ogListPrice(html: string): number | null {
  const m = html.match(/<meta[^>]+(?:property|name)="(?:og|product):(?:price:standard_amount|original_price:amount)"[^>]*>/i);
  const v = m?.[0].match(/content="(?:&quot;)?([\d.,]+)/)?.[1];
  return v ? parsePrice(v) : null;
}

type Json = Record<string, any>;

export function findProductNode(html: string): Json | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes: Json[] = Array.isArray(data) ? data : ((data as Json)["@graph"] ?? [data]);
    const hit = nodes.find((n) => /^(Product|ProductGroup)$/.test([].concat(n?.["@type"] ?? []).join()));
    if (hit) return hit;
  }
  return null;
}

const inStock = (availability: unknown) => !/OutOfStock|SoldOut|Discontinued/i.test(String(availability ?? ""));
const sizeName = (s: unknown) => (typeof s === "string" ? s : (s as Json)?.name ?? "");

export function parseJsonLdProduct(node: Json, url: string, defaultCurrency: CurrencyCode, scrapedAt: string, titlePrefix?: RegExp): ScrapedProduct | null {
  const brand = typeof node.brand === "string" ? node.brand : node.brand?.name ?? "";
  const rawTitle = String(node.name ?? "").replace(titlePrefix ?? /^$/, "").trim();
  if (!brand || !rawTitle || NOT_A_BOARD.test(rawTitle)) return null; // kids boards are kept (Kids filter)

  const variants: Json[] = node.hasVariant?.length ? node.hasVariant : [node];
  let currency = defaultCurrency;
  const listPrices: number[] = [];
  const raw = variants.flatMap((v) => {
    const offers: Json[] = [].concat(v.offers?.offers ?? v.offers ?? []);
    const offer = offers[0];
    if (!offer) return [];
    currency = (offer.priceCurrency ?? currency) as CurrencyCode;
    const price = parsePrice(offer.price ?? offer.lowPrice);
    const spec = [].concat(offer.priceSpecification ?? []).find((p: Json) => /ListPrice|StrikethroughPrice/i.test(p?.priceType ?? ""));
    if (spec) listPrices.push(parsePrice((spec as Json).price) ?? 0);
    const label = sizeName(v.size) || String(v.name ?? "").replace(rawTitle, "");
    const s = parseSizeLabel(label, inStock(offer.availability), price ?? undefined);
    return s ? [s] : [];
  });
  const sizes = mergeSizes(raw);
  if (!sizes.length) return null;
  const price = headlinePrice(sizes, []);
  if (price === null) return null;

  const images = [...new Set([...[].concat(node.image ?? []), ...variants.flatMap((v) => [].concat(v.image ?? []))]
    .map((i: Json | string) => (typeof i === "string" ? i : i?.url))
    .filter(Boolean)
    .map((src: string) => (src.startsWith("//") ? `https:${src}` : src)))].slice(0, 8);

  const rating = node.aggregateRating
    ? { average: Number(node.aggregateRating.ratingValue), count: Number(node.aggregateRating.reviewCount ?? node.aggregateRating.ratingCount ?? 0) }
    : null;
  const listPrice = listPrices.filter((n) => n > price);

  return {
    url,
    title: rawTitle,
    brand,
    model: displayModel(rawTitle, brand),
    season: seasonFrom(rawTitle),
    seasonKnown: hasModelYear(rawTitle),
    price,
    listPrice: listPrice.length ? Math.max(...listPrice) : null,
    currency,
    sizes,
    images,
    specs: extractSpecs(`${rawTitle} ${htmlToText(String(node.description ?? ""))}`),
    rating: rating && rating.count > 0 && Number.isFinite(rating.average) ? rating : null,
    scrapedAt,
  };
}

export function sitemapJsonLdAdapter(cfg: SitemapJsonLdConfig): RetailerAdapter {
  const parsePage = (text: string, url: string) => {
    const node = findProductNode(text);
    const parsed = node && parseJsonLdProduct(node, url, cfg.retailer.currency, new Date().toISOString(), cfg.titlePrefix);
    if (parsed && parsed.listPrice === null) {
      const rrp = cfg.listPriceFromHtml?.(text, parsed.price) ?? ogListPrice(text);
      if (rrp && rrp > parsed.price) parsed.listPrice = Math.round(rrp * 100) / 100;
    }
    return parsed ?? null;
  };
  return {
    retailer: cfg.retailer,
    async fetchOne(http, url) {
      const { text, url: finalUrl } = await http.get(url);
      return parsePage(text, finalUrl);
    },
    async *crawl(ctx: CrawlContext) {
      // 1. Discover product URLs.
      const queue = [...cfg.sitemaps];
      const products = new Set<string>();
      for (let i = 0; i < queue.length && i < 200; i++) {
        const { text } = await ctx.http.get(queue[i], "application/xml,text/xml;q=0.9,*/*;q=0.5");
        for (const loc of sitemapLocs(text)) {
          if (/\.xml(\?|$)|sitemap/i.test(loc) && !cfg.productUrl.test(loc)) {
            if (!cfg.followSitemap || cfg.followSitemap.test(loc)) queue.push(loc);
          } else if (cfg.productUrl.test(loc) && !NOT_A_BOARD.test(decodeURIComponent(loc).replace(/[+-]/g, " "))) {
            products.add(cfg.rewriteUrl ? cfg.rewriteUrl(loc) : loc);
          }
        }
      }
      ctx.log(`discovered ${products.size} product URLs`);

      // 2. Fetch + parse each product page.
      let yielded = 0;
      for (const url of products) {
        if (yielded >= ctx.limit) break;
        try {
          const { text, url: finalUrl } = await ctx.http.get(url);
          const parsed = parsePage(text, finalUrl);
          if (parsed) {
            yielded++;
            yield parsed;
          }
        } catch (e) {
          if (e instanceof BlockedError) throw e;
          ctx.log(`✗ ${url}: ${(e as Error).message}`);
        }
      }
    },
  };
}

