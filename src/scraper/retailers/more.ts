import { MORE_RETAILERS } from "@/lib/retailers-more";
import type { Retailer } from "@/lib/types";
import { displayModelFor, hasModelYear, seasonFrom } from "../parse/normalize";
import type { RawVariant } from "../parse/sizes";
import { parsePrice } from "../parse/text";
import type { RetailerAdapter, ScrapedProduct } from "../types";
import { shopifyAdapter } from "./shopify";
import { metaContent, ogProductNode, sitemapJsonLdAdapter } from "./sitemapJsonLd";

/**
 * Adapters for the shops in src/lib/retailers-more.ts. Each was written against pages
 * captured with scripts/capture-fixtures.ts (trimmed copies in src/scraper/__fixtures__/more/).
 */

const R = Object.fromEntries(MORE_RETAILERS.map((r) => [r.id, r])) as Record<string, Retailer>;

/** "JONES ULTRALIGHT BUTTERFLY SPLITBOARD 2024" → "Jones Ultralight Butterfly Splitboard 2024" (only all-caps titles). */
export const unshout = (s: string) =>
  /[a-z]/.test(s) ? s : s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/** Model year from the product URL ("…-snowboards-men-2021") when the title has none. */
function seasonFromUrl(p: ScrapedProduct): ScrapedProduct {
  if (p.seasonKnown) return p;
  const year = p.url.match(/-(20\d\d)(?:\.html?)?$/)?.[1];
  return year ? { ...p, season: seasonFrom(year), seasonKnown: hasModelYear(year) } : p;
}

// ── Absolute-Snow: JSON-LD has one offer; the sizes are radio buttons (only orderable sizes are listed). ──
export function absoluteSnowSizes(html: string): RawVariant[] {
  return [...html.matchAll(/data-title=(?:"([^"]+)"|([^\s>]+))>\s*<input[^>]*name=size-radio/g)].map((m) => ({ label: m[1] ?? m[2], inStock: true }));
}
export function absoluteSnowWas(html: string): number | null {
  const m = html.match(/product-info__price"?><div class="pricing-block pricing-block--was"><span[^>]*data-original-price=£?([\d.,]+)/);
  return m ? parsePrice(m[1]) : null;
}

// ── City Beach (Salesforce Commerce Cloud): the struck-through "list" price in the product's price block. ──
export function cityBeachWas(html: string): number | null {
  const m = html.match(/class="prices">\s*<div class="price">[\s\S]{0,300}?strike-through list">\s*<span class="value" content="([\d.]+)"/);
  return m ? Number(m[1]) : null;
}

// ── SoCal Skateshop (Miva): no JSON-LD; Open Graph product meta. Titles start with the size ("8.25x32 Brand Model Deck"). ──
export function socalNode(html: string) {
  const node = ogProductNode(html);
  if (!node) return null;
  const m = String(node.name).match(/^(\d{1,2}(?:\.\d+)?\s*x\s*\d{1,2}(?:\.\d+)?)\s+(.+)$/i);
  return m ? { ...node, name: `${m[2]} ${m[1]}` } : node;
}

// ── boardsports.eu (Shopware 5): Open Graph + schema.org microdata; sizes are configurator radios (disabled = sold out). ──
export function boardsportsNode(html: string) {
  const name = metaContent(html, "og:title");
  const price = metaContent(html, "price") ?? metaContent(html, "product:price");
  if (!name || !price) return null;
  const images = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/gi)].map((m) => m[1]);
  return {
    "@type": "Product",
    name: unshout(name),
    brand: metaContent(html, "product:brand") ?? "",
    image: images,
    offers: { price, priceCurrency: metaContent(html, "priceCurrency") ?? "EUR", availability: /itemprop="availability"[^>]*InStock/i.test(html) ? "InStock" : "OutOfStock" },
  };
}
export function boardsportsSizes(html: string): RawVariant[] {
  const form = html.match(/class="configurator--form"[\s\S]*?<\/form>/)?.[0] ?? "";
  return [...form.matchAll(/<input[^>]*class="option--input"[^>]*>/g)].map((m) => ({
    label: m[0].match(/title="([^"]*)"/)?.[1] ?? "",
    inStock: !/disabled/.test(m[0]),
  }));
}
export function boardsportsWas(html: string): number | null {
  const m = html.match(/class="price--line-through">\s*(?:&euro;|€)?\s*([\d.,]+)/);
  return m ? parsePrice(m[1]) : null;
}

/** Pukas lists every board (one size, one SKU) as its own product: "Pukas Surfboards - Solid Mood by David Santos - FCS II - 6'1" x 19" x 2.56" - 30.5L - DS02881" → "Solid Mood 6'1" 30.5L". */
export function pukasTitle(title: string): string {
  const t = title.replace(/^pre ?order\s*\|\s*/i, "");
  const m = t.match(/^Pukas Surfboards\s*-\s*(.+?)\s+by\s+.+?\s-\s.*?(\d{1,2}\s*['’]\s*\d{0,2}(?:\.\d+)?\s*["”]?).*?(\d{1,3}(?:[.,]\d{1,2})?\s*L)\b/i);
  return m ? `${unshout(m[1])} ${m[2].trim()} ${m[3].replace(/\s+/g, "")}` : t.replace(/^Pukas Surfboards\s*-\s*/i, "");
}

const reject = (re: RegExp) => (p: ScrapedProduct) => (re.test(p.title) ? null : remodel(p));

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
/**
 * Model without the brand (also when the shop spells it differently: "Anti-Hero" vs "Antihero",
 * "Santa Cruz Skate" vs "Santa Cruz", "Powell-Peralta" vs "Powell Peralta"), the snow style
 * descriptors some shops append ("… All Mountain/Freeride Snowboard") and inch marks written as two quotes.
 */
export function remodel(p: ScrapedProduct): ScrapedProduct {
  let model = displayModelFor(p.sport, p.title.replace(/''/g, '"'), p.brand);
  const words = p.brand.split(/[\s-]+/).filter(Boolean);
  for (let n = words.length; n > 0; n--) {
    const prefix = squash(words.slice(0, n).join(""));
    const m = model.match(/^(\S+)(?:\s+(\S+))?(?:\s+(\S+))?/);
    const heads = [1, 2, 3].map((k) => m?.slice(1, k + 1).filter(Boolean).join(" ") ?? "");
    const hit = prefix.length >= 3 ? heads.find((h) => h && squash(h) === prefix) : undefined;
    if (hit && model.length > hit.length) { model = model.slice(hit.length).trim(); break; }
  }
  if (p.sport === "snow") model = model.replace(/\s+(?:all[- ]mountain|freeride|freestyle|park|powder|backcountry)(?:\s*\/\s*(?:all[- ]mountain|freeride|freestyle|park|powder|backcountry))*\s*$/i, "");
  return { ...p, model: model.replace(/\s*[-–]\s*$/, "").trim() || p.model };
}

export const MORE_ADAPTERS: Record<string, RetailerAdapter> = {
  "absolute-snow-uk": sitemapJsonLdAdapter({
    retailer: R["absolute-snow-uk"],
    sitemaps: ["https://www.absolute-snow.co.uk/sitemap-products.xml"],
    productUrls: { snow: /absolute-snow\.co\.uk\/(?![\w-]*package)[\w-]+-(?:snowboards|splitboards)-(?:men|women|kids|boy|girl)-20\d\d$/ },
    variantsFromHtml: absoluteSnowSizes,
    listPriceFromHtml: absoluteSnowWas,
    fixup: (p) => (/package|bundle/i.test(p.title) ? null : remodel(seasonFromUrl(p))),
  }),
  "city-beach": sitemapJsonLdAdapter({
    retailer: R["city-beach"],
    sitemaps: ["https://www.citybeach.com/au/sitemap_index.xml"],
    productUrls: { skate: /citybeach\.com\/au\/[^/]+-(?:complete-skateboard|skateboard-deck|cruiser-skateboard|longboard|surfskate)\/\d+-\d+\.html$/ },
    listPriceFromHtml: cityBeachWas,
  }),
  zumiez: sitemapJsonLdAdapter({
    retailer: R.zumiez,
    sitemaps: ["https://www.zumiez.com/sitemap.xml"],
    // Snowboard sizes are only loaded client-side (GraphQL, disallowed by robots.txt): skate only, size from the title.
    productUrls: { skate: /zumiez\.com\/[\w-]+-(?:skateboard-deck|complete-skateboard|cruiser-complete-skateboard|cruiser-skateboard)\.html$/ },
    fixup: remodel,
  }),
  "powell-peralta": sitemapJsonLdAdapter({
    retailer: R["powell-peralta"],
    sitemaps: ["https://powell-peralta.com/sitemaps/powellperalta/sitemap.xml"],
    productUrls: { skate: /powell-peralta\.com\/powell-peralta-(?![\w-]*blem)[\w-]*(?:skateboard-deck|complete-skateboard|skateboard-assembly)[\w-]*$/ },
    fixup: (p) => remodel({ ...p, brand: "Powell Peralta" }),
  }),
  "socal-skateshop": sitemapJsonLdAdapter({
    retailer: R["socal-skateshop"],
    sitemaps: ["https://socalskateshop.com/sitemap.xml"],
    productUrls: { skate: /socalskateshop\.com\/(?![\w-]*(?:Fingerboard|Tech-Deck|Grip|Bolts|Hardware|Rails?-|Wheels|Trucks|Decks-All))[\w-]*-(?:Deck|Complete|Cruiser|Longboard)-[\w-]*\d[\w-]*\.html$/i },
    productNodeFromHtml: socalNode,
    fixup: remodel,
  }),
  skatehut: sitemapJsonLdAdapter({
    retailer: R.skatehut,
    sitemaps: ["https://www.skatehut.co.uk/sitemap.xml"],
    productUrls: { skate: /skatehut\.co\.uk\/(?![\w-]*(?:scooter|bmx|fingerboard|tech-deck))[\w-]+-(?:skateboard-deck|deck|complete-skateboard|complete-cruiser|cruiser-skateboard|complete-longboard|longboard-complete|surfskate)(?:-[\w-]*)?\.htm$/ },
    fixup: reject(/scooter|bmx/i),
  }),
  sickboards: sitemapJsonLdAdapter({
    retailer: R.sickboards,
    sitemaps: [], // none published: category listings instead
    listings: [
      { sport: "skate", url: "https://www.sickboards.nl/en/672-skateboard-decks" },
      { sport: "skate", url: "https://www.sickboards.nl/en/702-skateboard-completes" },
      { sport: "skate", url: "https://www.sickboards.nl/en/100-longboard-complete" },
    ],
    productUrls: { skate: /sickboards\.nl\/en\/[a-z0-9-]+\/\d+(?:-\d+)?-[\w-]+\.html$/ },
  }),
  "boardsports-eu": sitemapJsonLdAdapter({
    retailer: R["boardsports-eu"],
    sitemaps: [], // robots.txt points at the sister shop's sitemap: category listings instead
    listings: [
      { sport: "snow", url: "https://www.boardsports.eu/snowboards" },
      { sport: "snow", url: "https://www.boardsports.eu/splitboards" },
      { sport: "skate", url: "https://www.boardsports.eu/longboards" },
    ],
    listingPage: (u, n) => `${u}?p=${n}`,
    productUrls: {
      snow: /boardsports\.eu\/[\w.-]+-(?:snowboard|splitboard)-20\d\d$/,
      skate: /boardsports\.eu\/[\w.-]+-(?:longboard-complete|cruiser-complete|surfskate-complete|surfskate)$/,
    },
    productNodeFromHtml: boardsportsNode,
    variantsFromHtml: boardsportsSizes,
    listPriceFromHtml: boardsportsWas,
  }),
  // ── Shopify stores (the brand's / shop's actual store) ──
  // The vendor is "Yonex USA" and titles are all caps ("SLEEK - 30TH ANNIVERSARY").
  yonex: shopifyAdapter({ retailer: R.yonex, collections: [{ sport: "snow", handle: "snowboards" }], rewrite: (p) => ({ ...p, vendor: "Yonex", title: unshout(p.title) }) }),
  "pukas-shop": shopifyAdapter({ retailer: R["pukas-shop"], collections: [{ sport: "surf", handle: "pukas-surfboards" }], rewrite: (p) => ({ ...p, vendor: "Pukas", title: pukasTitle(p.title) }) }),
  skatemenu: shopifyAdapter({ retailer: R.skatemenu, sports: ["skate"], rewrite: (p) => ({ ...p, vendor: unshout(p.vendor) }) }),
  "nhs-santa-cruz": shopifyAdapter({
    retailer: R["nhs-santa-cruz"],
    collections: [
      { sport: "skate", handle: "skateboard-decks" },
      { sport: "skate", handle: "complete-skateboards" },
      { sport: "skate", handle: "skate-cruisers-longboards" },
    ],
  }),
};

