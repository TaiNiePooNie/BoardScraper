import { MORE_RETAILERS } from "./retailers-more";
import { SHOPIFY_SHOPS } from "./retailers-shopify";
import type { Retailer } from "./types";

/**
 * Live retailers. Each was checked (2026-11) for robots.txt compliance of the
 * paths we use. Shipping rules are ESTIMATES from public shipping pages and
 * should be re-verified each season.
 *
 * Evaluated and excluded:
 *  - snowleader.com, sportconrad.com, absolute-snow.co.uk — 403/429 to automated clients
 *    (snowleader.com and absolute-snow.co.uk re-checked 2026-11-15: robots.txt itself answers 403)
 *  - the-house.com — Cloudflare bot challenge
 *  - snowboard-asylum.com — robots.txt disallows /product and /category
 *  - bergzeit.de — board pages not identifiable from sitemap; category pages on another host
 *  - tradeinn.com (snowinn) — no structured product data; HTML-only (candidate for a Playwright adapter)
 *
 * Candidates not yet surveyed (~75 shops and brand stores, incl. absolutesnow.com): the
 * list lives in scripts/survey-retailers.ts. Run `npm run survey` from a network that
 * can reach them, then add Shopify shops with `shopifyAdapter` (src/scraper/retailers/
 * shopify.ts) and sitemap + JSON-LD shops with `sitemapJsonLdAdapter`.
 */
const EU_EXCEPT_HOME = ["BE", "BG", "CZ", "DK", "EE", "FI", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "ES", "CY", "MT"];

export const RETAILERS: Record<string, Retailer> = {
  evo: {
    id: "evo",
    name: "evo",
    homepage: "https://www.evo.com",
    country: "US",
    currency: "USD",
    pricesIncludeVat: false,
    shipping: [
      { destinations: ["US"], cost: 0, freeAbove: 50, etaDays: [3, 7] },
      { destinations: ["CA"], cost: 35, etaDays: [5, 12] },
    ],
  },
  "blue-tomato": {
    id: "blue-tomato",
    name: "Blue Tomato",
    homepage: "https://www.blue-tomato.com",
    country: "AT",
    currency: "EUR",
    pricesIncludeVat: true,
    fixedGrossInEu: true, // same gross price shown in every EU locale
    shipping: [
      { destinations: ["AT", "DE"], cost: 4.95, freeAbove: 50, etaDays: [2, 4] },
      { destinations: ["FR", ...EU_EXCEPT_HOME], cost: 6.95, freeAbove: 100, etaDays: [3, 7] },
      { destinations: ["CH", "NO", "GB"], cost: 14.95, etaDays: [4, 9] },
    ],
  },
  glisshop: {
    id: "glisshop",
    name: "Glisshop",
    homepage: "https://www.glisshop.com",
    country: "FR",
    currency: "EUR",
    pricesIncludeVat: true,
    fixedGrossInEu: true,
    shipping: [
      { destinations: ["FR"], cost: 0, freeAbove: 80, etaDays: [2, 4] },
      { destinations: ["AT", "DE", ...EU_EXCEPT_HOME], cost: 9.9, freeAbove: 150, etaDays: [3, 8] },
      { destinations: ["CH", "GB"], cost: 19.9, etaDays: [5, 10] },
    ],
  },
  ...Object.fromEntries(SHOPIFY_SHOPS.map((x) => [x.retailer.id, x.retailer])),
  ...Object.fromEntries(MORE_RETAILERS.map((r) => [r.id, r])),
};
