import type { CurrencyCode, Retailer, Sport } from "@/lib/types";
import { BlockedError, sitemapLocs } from "../http";
import { displayModelFor, hasModelYear, NOT_A_BOARD, seasonFrom } from "../parse/normalize";
import { buildSizes, headlinePrice, pageFeatures, type PageFeatures, type RawVariant } from "../parse/sizes";
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
  /**
   * For shops whose JSON-LD has one offer per product but whose page lists the sizes
   * (size radios / select options, with stock where shown): the page's size variants.
   */
  variantsFromHtml?: (html: string) => RawVariant[] | null;
  /** For pages without Product JSON-LD: build an equivalent node from the HTML (e.g. ogProductNode). */
  productNodeFromHtml?: (html: string, url: string) => Record<string, any> | null;
  /** Shop-specific last touches (brand spelling, season from the URL…); null drops the product. */
  fixup?: (p: ScrapedProduct, html: string) => ScrapedProduct | null;
  /**
   * Category listing pages to discover products from (shops without a product sitemap).
   * Product links are the hrefs matching `productUrls[sport]`; pages are walked until one
   * adds no new product (page 2+ from `listingPage`, default `?page=N`).
   */
  listings?: ReadonlyArray<{ sport: Sport; url: string }>;
  listingPage?: (url: string, page: number) => string;
  maxListingPages?: number;
}

/** Open Graph product price meta many shops emit: og:price:standard_amount / product:original_price:amount. */
export function ogListPrice(html: string): number | null {
  const m = html.match(/<meta[^>]+(?:property|name)="(?:og|product):(?:price:standard_amount|original_price:amount)"[^>]*>/i);
  const v = m?.[0].match(/content="(?:&quot;)?([\d.,]+)/)?.[1];
  return v ? parsePrice(v) : null;
}

type Json = Record<string, any>;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\:]/g, "\\$&");
/** content of <meta property|name="prop" content="…">, attribute order-independent. */
export function metaContent(html: string, prop: string): string | null {
  for (const tag of html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escapeRe(prop)}["'][^>]*>`, "gi")) ?? []) {
    const v = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (v !== undefined) return htmlToText(v);
  }
  return null;
}

/**
 * Open Graph product meta (og:title, product:brand, product:price:amount/currency,
 * product:availability, og:image) as a schema.org-like Product node. Many hosted shop
 * platforms emit these for social catalogues even without Product JSON-LD.
 */
export function ogProductNode(html: string): Json | null {
  const name = metaContent(html, "og:title");
  const price = metaContent(html, "product:price:amount") ?? metaContent(html, "og:price:amount");
  if (!name || !price) return null;
  const availability = metaContent(html, "product:availability") ?? metaContent(html, "og:availability") ?? "";
  return {
    "@type": "Product",
    name,
    brand: metaContent(html, "product:brand") ?? metaContent(html, "og:brand") ?? "",
    image: [...html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/gi)].map((m) => m[1]),
    category: metaContent(html, "product:category") ?? "",
    offers: {
      price,
      priceCurrency: metaContent(html, "product:price:currency") ?? metaContent(html, "og:price:currency") ?? undefined,
      availability: /out ?of ?stock|sold ?out|unavailable|discontinued/i.test(availability) ? "OutOfStock" : "InStock",
    },
  };
}

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
  // Some shops emit several Product nodes (e.g. a minimal one plus a full one): prefer the one with brand + offers.
  const nodes = jsonLdNodes(html).filter((n) => /^(Product|ProductGroup)$/.test(typeOf(n)));
  return nodes.find((n) => n.brand && (n.offers || n.hasVariant)) ?? nodes[0] ?? null;
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
  /** Size variants read from the page HTML; replace the JSON-LD variants when non-empty. */
  variants?: RawVariant[] | null;
}

export function parseJsonLdProduct(node: Json, url: string, defaultCurrency: CurrencyCode, scrapedAt: string, opts: JsonLdOptions = {}): ScrapedProduct | null {
  const brand = htmlToText(typeof node.brand === "string" ? node.brand : node.brand?.name ?? "");
  const rawTitle = htmlToText(String(node.name ?? "")).replace(opts.titlePrefix ?? /^$/, "").trim();
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
  const offerPrice = raw.find((r) => r.price !== undefined)?.price;
  const pageVariants = opts.variants?.length ? opts.variants.map((v) => ({ ...v, price: v.price ?? offerPrice })) : null;
  const sizes = buildSizes(sport, pageVariants ?? raw, rawTitle, opts.features);
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
    const node = findProductNode(text) ?? cfg.productNodeFromHtml?.(text, url) ?? null;
    if (!node) return null;
    const breadcrumbs = findBreadcrumbs(text);
    const sport = urlSport ?? detectSport(breadcrumbs.join(" ")) ?? sports[0];
    const features = sport === "snow" ? {} : pageFeatures(sport, htmlToText(text));
    const parsed = parseJsonLdProduct(node, url, cfg.retailer.currency, new Date().toISOString(), { titlePrefix: cfg.titlePrefix, sport, breadcrumbs, features, variants: cfg.variantsFromHtml?.(text) });
    if (parsed && parsed.listPrice === null) {
      const rrp = cfg.listPriceFromHtml?.(text, parsed.price) ?? ogListPrice(text);
      if (rrp && rrp > parsed.price) parsed.listPrice = Math.round(rrp * 100) / 100;
    }
    if (parsed && cfg.fixup) return cfg.fixup(parsed, text);
    return parsed ?? null;
  };
  return {
    retailer: cfg.retailer,
    sports,
    slow: true,
    async fetchOne(http, url) {
      const { text, url: finalUrl } = await http.get(url);
      return parsePage(text, finalUrl, sportOf(url));
    },
    async *crawl(ctx: CrawlContext) {
      const allowed = ctx.sports ? sports.filter((s) => ctx.sports!.includes(s)) : sports;
      const yielded = new Map<Sport, number>();
      const count = (s: Sport) => yielded.get(s) ?? 0;
      const isGearSlug = (loc: string, sport: Sport) =>
        sport === "snow" ? NOT_A_BOARD.test(decodeURIComponent(loc).replace(/[+-]/g, " ")) : isSkateSurfGear(slugTitle(loc));

      // 1. Discover product URLs: sitemaps up front, category listings page by page (lazily).
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
          if (!sport || isGearSlug(loc, sport)) continue;
          products.set(cfg.rewriteUrl ? cfg.rewriteUrl(loc) : loc, sport);
        }
      }
      if (cfg.sitemaps.length) {
        const bySport = allowed.map((s) => `${s} ${[...products.values()].filter((x) => x === s).length}`).join(", ");
        ctx.log(`discovered ${products.size} product URLs (${bySport})`);
      }
      const seen = new Set(products.keys());
      async function* candidates(): AsyncGenerator<[string, Sport]> {
        // Boards we already list first: a time-boxed run keeps their prices fresh and spends
        // what time is left on discovering new ones.
        // Known URLs come stalest first, so time-boxed runs rotate through all of them.
        // Shops without a sitemap only list products on category pages: re-check those directly.
        const known = ctx.knownUrls ?? new Set<string>();
        for (const u of known) {
          const sport = products.get(u) ?? (cfg.sitemaps.length ? undefined : sportOf(u, allowed));
          if (sport) { seen.add(u); yield [u, sport]; }
        }
        for (const entry of products) if (!known.has(entry[0])) yield entry;
        for (const listing of cfg.listings ?? []) {
          if (!allowed.includes(listing.sport)) continue;
          for (let page = 1; page <= (cfg.maxListingPages ?? 40) && count(listing.sport) < ctx.limit; page++) {
            const pageUrl = page === 1 ? listing.url : (cfg.listingPage ?? ((u, n) => `${u}${u.includes("?") ? "&" : "?"}page=${n}`))(listing.url, page);
            let html: string;
            try {
              html = (await ctx.http.get(pageUrl)).text;
            } catch (e) {
              if (e instanceof BlockedError) throw e;
              ctx.log(`✗ ${pageUrl}: ${(e as Error).message}`);
              break;
            }
            const links = [...html.matchAll(/href="([^"]+)"/g)]
              .map((m) => { try { return new URL(m[1].replace(/&amp;/g, "&"), pageUrl).href.replace(/#.*$/, ""); } catch { return ""; } })
              .filter((u) => cfg.productUrls[listing.sport]!.test(u) && !seen.has(u));
            const fresh = [...new Set(links)];
            ctx.log(`${listing.url} page ${page}: ${fresh.length} new product links`);
            if (!fresh.length) break;
            for (const u of fresh) {
              seen.add(u);
              if (!isGearSlug(u, listing.sport)) yield [u, listing.sport];
            }
          }
        }
      }

      // 2. Fetch + parse each product page.
      for await (const [url, sport] of candidates()) {
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
