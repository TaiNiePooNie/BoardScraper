import type { Retailer, ShippingRule } from "./types";

/**
 * Shops and brand stores that are not plain Shopify shops on the surveyed host
 * (survey 2026-11-15: robots.txt allows every path we use). Parsers were written
 * against pages captured from GitHub Actions with scripts/capture-fixtures.ts (per-site
 * hints in scripts/fixture-targets.ts); adapters are in src/scraper/retailers/more.ts.
 * Shipping: from the shop's public shipping page or product-page shipping data where
 * stated, otherwise ESTIMATES for a board-size parcel (marked "est."). Re-check each season.
 *
 * The 17 non-Shopify candidates of the 2026-11 survey:
 *  added    absolute-snow-uk, city-beach, zumiez, powell-peralta, socal-skateshop, skatehut,
 *           skatedeluxe, sickboards, boardsports-eu (sitemap or category listings → JSON-LD /
 *           Open Graph product meta), yonex (us.yonex.com snowboards collection, Shopify)
 *  added via the store the brand links to (Shopify):
 *           pukas → pukassurfshop.com, jart → skatemenu.com (Spanish distributor store),
 *           santa-cruz → nhsskatedirect.com (NHS, the brand's own US store)
 *  not added (see NOT_ADDED below for the reasons): chilli, slimes, xdubai, ogasaka
 */

const EU = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
const without = (list: string[], ...drop: string[]) => list.filter((c) => !drop.includes(c));
const rule = (destinations: string[], cost: number, freeAbove?: number, eta?: [number, number]): ShippingRule => ({ destinations, cost, ...(freeAbove !== undefined ? { freeAbove } : {}), ...(eta ? { etaDays: eta } : {}) });
const retailer = (id: string, name: string, homepage: string, country: string, currency: Retailer["currency"], pricesIncludeVat: boolean, shipping: ShippingRule[], extra: Partial<Retailer> = {}): Retailer =>
  ({ id, name, homepage, country, currency, pricesIncludeVat, shipping, ...extra });

export const MORE_RETAILERS: Retailer[] = [
  // ── UK ──
  retailer("absolute-snow-uk", "Absolute-Snow", "https://www.absolute-snow.co.uk", "GB", "GBP", true, [rule(["GB"], 4.95, 50, [1, 3]), rule(EU, 25, undefined, [4, 10])]), // est.
  retailer("skatehut", "SkateHut", "https://www.skatehut.co.uk", "GB", "GBP", true, [rule(["GB"], 4.99, 100, [2, 4]), rule(EU, 20, undefined, [4, 10])]), // UK economy free over £100 in 2–4 days (delivery page); costs est.
  // ── EU ──
  retailer("skatedeluxe", "skatedeluxe", "https://www.skatedeluxe.com", "DE", "EUR", true, [rule(["DE"], 4.95, 50, [1, 3]), rule(without(EU, "DE"), 9.95, 100, [3, 8]), rule(["CH", "GB", "NO"], 19.95, undefined, [4, 10])], { fixedGrossInEu: true }), // est.
  retailer("sickboards", "Sickboards", "https://www.sickboards.nl", "NL", "EUR", true, [rule(["NL"], 6.95, 100, [1, 3]), rule(["BE", "DE", "LU"], 9.95, 150, [2, 5]), rule(without(EU, "NL", "BE", "DE", "LU"), 17.5, undefined, [3, 8])], { fixedGrossInEu: true }), // est.
  retailer("boardsports-eu", "boardsports.eu", "https://www.boardsports.eu", "DE", "EUR", true, [rule(["DE"], 5.95, 100, [1, 3]), rule(without(EU, "DE"), 15, undefined, [3, 8]), rule(["CH", "GB", "NO"], 30, undefined, [4, 10])], { fixedGrossInEu: true }), // est.
  retailer("pukas-shop", "Pukas Surf Shop", "https://pukassurfshop.com", "ES", "EUR", true, [rule(["ES"], 60, undefined, [3, 7]), rule(["PT", "FR"], 90, undefined, [4, 10]), rule(without(EU, "ES", "PT", "FR"), 150, undefined, [5, 14])], { fixedGrossInEu: true }), // est. (surfboard freight)
  retailer("skatemenu", "Skatemenu (Jart, Yow, Long Island)", "https://skatemenu.com", "ES", "EUR", true, [rule(["ES"], 5.95, 60, [2, 4]), rule(without(EU, "ES"), 15, undefined, [3, 8])], { fixedGrossInEu: true }), // est.
  // ── North America ──
  retailer("zumiez", "Zumiez", "https://www.zumiez.com", "US", "USD", false, [rule(["US"], 8, 75, [3, 7])]), // est.
  retailer("powell-peralta", "Powell-Peralta", "https://powell-peralta.com", "US", "USD", false, [rule(["US"], 10, 75, [3, 7]), rule(["CA"], 35, undefined, [5, 12])]), // est.
  retailer("socal-skateshop", "SoCal Skateshop", "https://socalskateshop.com", "US", "USD", false, [rule(["US"], 10, 70, [2, 6]), rule(["CA"], 40, undefined, [5, 12])]), // US free over $70 from shipping page; costs est.
  retailer("nhs-santa-cruz", "NHS Skate Direct (Santa Cruz)", "https://nhsskatedirect.com", "US", "USD", false, [rule(["US"], 8, 75, [3, 7])]), // est.
  retailer("yonex", "Yonex USA", "https://us.yonex.com", "US", "USD", false, [rule(["US"], 15, 100, [3, 7])]), // est.
  // ── Australia ──
  retailer("city-beach", "City Beach", "https://www.citybeach.com/au", "AU", "AUD", true, [rule(["AU"], 10.99, undefined, [3, 13])]), // standard rate + times from the product pages' shipping data
];

/** Candidates from scripts/survey-retailers.ts that were evaluated and not added. */
export const NOT_ADDED: Record<string, string> = {
  chilli: "chillisurfboards.com shows a region chooser instead of the product (region kept in a session cookie); no product data without it",
  slimes: "slimes.com.au is a store-locator site with no online shop; the linked oceanearthstore.com answered HTTP 500",
  xdubai: "xdubai.com is an events site; the linked xdubaishop.com answered HTTP 503",
  ogasaka: "no boards sold online: ogasaka-snowboard.com is a catalogue, ogasakashop.com sells apparel and goods",
};
