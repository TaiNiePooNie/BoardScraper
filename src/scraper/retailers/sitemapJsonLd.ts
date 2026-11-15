import type { CurrencyCode, Retailer, Sport } from "@/lib/types";
import { BlockedError, sitemapLocs } from "../http";
import { displayModelFor, hasModelYear, NOT_A_BOARD, seasonFrom } from "../parse/normalize";
import { buildSizes, headlinePrice, pageFeatures, type PageFeatures } from "../parse/sizes";
import { extractSpecs } from "../parse/specs";
import { classifyCategory, detectSport, isSkateSurfGear, NO_SPECS } from "../parse/sport";
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
  /** Which <loc> URLs are board product pages, per sport. */
  productUrls: Partial<Record<Sport, RegExp>>;
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

function jsonLdNodes(html: string): Json[] {
  const out: Json[] = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    out.push(...(Array.isArray(data) ? data : ((data as Json)["@graph"] ?? [data])));
  }
  return out;
}
const typeOf = (n: Json) => [].concat(n?.["@type"] ?? []).join();

export function findProductNode(html: string): Json | null {
  return jsonLdNodes(html).find((n) => /^(Product|ProductGroup)$/.test(typeOf(n))) ?? null;
}

/** schema.org BreadcrumbList names, e.g. ["Home", "Skate Shop", "Longboard & Cruiser", "Longboards"]. */
export function findBreadcrumbs(html: string): string[] {
  const node = jsonLdNodes(html).find((n) => typeOf(n) === "BreadcrumbList");
  return [].concat(node?.itemListElement ?? [])
    .sort((a: Json, b: Json) => Number(a?.position ?? 0) - Number(b?.position ?? 0))
    .map((i: Json) => String(i?.name ?? i?.item?.name ?? "").trim())
    .filter(Boolean);
}

const inStock = (availability: unknown) => !/OutOfStock|SoldOut|Discontinued/i.test(String(availability ?? ""));
const sizeName = (s: unknown) => (typeof s === "string" ? s : (s as Json)?.name ?? "");

export interface JsonLdOptions {
  titlePrefix?: RegExp;
  /** Sport the URL was discovered under; else from breadcrumbs/title, else snow. */
  sport?: Sport;
  breadcrumbs?: string[];
  /** Page-level size facts (width, length, volume) for one-size products. */
  features?: PageFeatures;
}

export function parseJsonLdProduct(node: Json, url: string, defaultCurrency: CurrencyCode, scrapedAt: string, opts: JsonLdOptions = {}): ScrapedProduct | null {
  const brand = typeof node.brand === "string" ? node.brand : node.brand?.name ?? "";
  const rawTitle = String(node.name ?? "").replace(opts.titlePrefix ?? /^$/, "").trim();
  if (!brand || !rawTitle) return null;
  const crumbs = opts.breadcrumbs ?? [];
  const sport = opts.sport ?? detectSport(`${crumbs.join(" ")} ${rawTitle}`) ?? "snow";
  if (sport === "snow") {
    if (NOT_A_BOARD.test(rawTitle)) return null; // kids boards are kept (Kids filter)
  } else if (isSkateSurfGear(rawTitle) || (crumbs.length > 1 && isSkateSurfGear(crumbs[crumbs.length - 1]))) {
    return null;
  }

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
    return [{ label, inStock: inStock(offer.availability), price: price ?? undefined }];
  });
  const sizes = buildSizes(sport, raw, rawTitle, opts.features);
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
  const description = htmlToText(String(node.description ?? ""));
  const specs = sport === "snow" ? extractSpecs(`${rawTitle} ${description}`) : NO_SPECS;
  // Most specific breadcrumbs (e.g. "Longboard & Cruiser > Longboards") are the shop's own taxonomy.
  const taxonomy = crumbs.slice(-2).join(" ");

  return {
    url,
    title: rawTitle,
    sport,
    category: classifyCategory(sport, taxonomy, rawTitle, description, specs, sizes.map((s) => s.lengthCm)),
    brand,
    model: displayModelFor(sport, rawTitle, brand),
    season: seasonFrom(rawTitle),
    seasonKnown: hasModelYear(rawTitle),
    price,
    listPrice: listPrice.length ? Math.max(...listPrice) : null,
    currency,
    sizes,
    images,
    specs,
    rating: rating && rating.count > 0 && Number.isFinite(rating.average) ? rating : null,
    scrapedAt,
  };
}

/** Readable product name from a sitemap URL slug: ".../product/Flying+Wheels-Clockwork+31+Surfskate-784481/" → "Flying Wheels Clockwork 31 Surfskate". */
export const slugTitle = (loc: string) =>
  decodeURIComponent(loc.replace(/\/$/, "").split("/").pop() ?? "").replace(/-\d+$/, "").replace(/[+-]/g, " ");

export function sitemapJsonLdAdapter(cfg: SitemapJsonLdConfig): RetailerAdapter {
  const sports = Object.keys(cfg.productUrls) as Sport[];
  const sportOf = (url: string, allowed: readonly Sport[] = sports) => allowed.find((s) => cfg.productUrls[s]!.test(url));

  const parsePage = (text: string, url: string, urlSport?: Sport) => {
    const node = findProductNode(text);
    if (!node) return null;
    const breadcrumbs = findBreadcrumbs(text);
    const sport = urlSport ?? detectSport(breadcrumbs.join(" ")) ?? sports[0];
    const features = sport === "snow" ? {} : pageFeatures(sport, htmlToText(text));
    const parsed = parseJsonLdProduct(node, url, cfg.retailer.currency, new Date().toISOString(), { titlePrefix: cfg.titlePrefix, sport, breadcrumbs, features });
    if (parsed && parsed.listPrice === null) {
      const rrp = cfg.listPriceFromHtml?.(text, parsed.price) ?? ogListPrice(text);
      if (rrp && rrp > parsed.price) parsed.listPrice = Math.round(rrp * 100) / 100;
    }
    return parsed ?? null;
  };
  return {
    retailer: cfg.retailer,
    sports,
    async fetchOne(http, url) {
      const { text, url: finalUrl } = await http.get(url);
      return parsePage(text, finalUrl, sportOf(url));
    },
    async *crawl(ctx: CrawlContext) {
      const allowed = ctx.sports ? sports.filter((s) => ctx.sports!.includes(s)) : sports;
      // 1. Discover product URLs.
      const queue = [...cfg.sitemaps];
      const products = new Map<string, Sport>();
      const isProduct = (loc: string) => sports.some((s) => cfg.productUrls[s]!.test(loc));
      for (let i = 0; i < queue.length && i < 200; i++) {
        const { text } = await ctx.http.get(queue[i], "application/xml,text/xml;q=0.9,*/*;q=0.5");
        for (const loc of sitemapLocs(text)) {
          if (/\.xml(\?|$)|sitemap/i.test(loc) && !isProduct(loc)) {
            if (!cfg.followSitemap || cfg.followSitemap.test(loc)) queue.push(loc);
            continue;
          }
          const sport = sportOf(loc, allowed);
          if (!sport) continue;
          if (sport === "snow" ? NOT_A_BOARD.test(decodeURIComponent(loc).replace(/[+-]/g, " ")) : isSkateSurfGear(slugTitle(loc))) continue;
          products.set(cfg.rewriteUrl ? cfg.rewriteUrl(loc) : loc, sport);
        }
      }
      const bySport = allowed.map((s) => `${s} ${[...products.values()].filter((x) => x === s).length}`).join(", ");
      ctx.log(`discovered ${products.size} product URLs (${bySport})`);

      // 2. Fetch + parse each product page.
      const yielded = new Map<Sport, number>();
      const count = (s: Sport) => yielded.get(s) ?? 0;
      for (const [url, sport] of products) {
        if (allowed.every((s) => count(s) >= ctx.limit)) break;
        if (count(sport) >= ctx.limit) continue;
        try {
          const { text, url: finalUrl } = await ctx.http.get(url);
          const parsed = parsePage(text, finalUrl, sport);
          if (parsed) {
            yielded.set(sport, count(sport) + 1);
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
