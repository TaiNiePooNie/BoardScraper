import type { Retailer, ShippingRule, Sport } from "./types";

/**
 * Shopify shops and brand stores (surveyed 2026-11-15 from GitHub Actions with
 * scripts/survey-retailers.ts + scripts/survey-deep.ts: robots.txt allows /products.json,
 * and the classifier found boards). Destinations come from each store's own
 * /meta.json "ships_to_countries"; costs from its public shipping policy where it
 * states them, otherwise ESTIMATES for a board-size parcel (marked "est."). Re-check each season.
 * The 17 surveyed shops that are not plain Shopify (added via HTML/JSON-LD adapters, via the
 * brand's separate store, or left out with the reason) are listed in retailers-more.ts.
 */

const EU = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
const without = (list: string[], ...drop: string[]) => list.filter((c) => !drop.includes(c));

export interface ShopifyShop {
  retailer: Retailer;
  /** Adapter options (see shopifyAdapter). */
  sports?: readonly Sport[];
  defaultSport?: Sport;
}

const shop = (
  id: string, name: string, homepage: string, country: string, currency: Retailer["currency"],
  pricesIncludeVat: boolean, shipping: ShippingRule[], extra: Partial<Retailer> & Omit<ShopifyShop, "retailer"> = {},
): ShopifyShop => {
  const { sports, defaultSport, ...r } = extra;
  return { retailer: { id, name, homepage, country, currency, pricesIncludeVat, shipping, ...r }, sports, defaultSport };
};

const rule = (destinations: string[], cost: number, freeAbove?: number, eta?: [number, number]): ShippingRule => ({ destinations, cost, ...(freeAbove !== undefined ? { freeAbove } : {}), ...(eta ? { etaDays: eta } : {}) });

export const SHOPIFY_SHOPS: ShopifyShop[] = [
  // ── North America: shops ──
  shop("ccs", "CCS", "https://shop.ccs.com", "US", "USD", false, [rule(["US"], 8, 75, [3, 7]), rule(["CA"], 35, undefined, [5, 12]), rule(["*"], 90, undefined, [7, 21])], { sports: ["skate"] }), // est. intl
  shop("boardroom", "The Boardroom Shop", "https://boardroomshop.com", "CA", "CAD", false, [rule(["CA"], 14.99, 99, [2, 6]), rule(["US"], 40, undefined, [5, 10])]), // US est.
  shop("freeride-boardshop", "Freeride Boardshop", "https://www.freerideboardshop.com", "CA", "CAD", false, [rule(["CA"], 15, 100, [2, 7]), rule(["US"], 40, undefined, [5, 10]), rule([...EU, "GB", "AU", "NZ"], 120, undefined, [7, 21])]), // est. except CA
  shop("empire", "Empire", "https://thinkempire.com", "CA", "CAD", false, [rule(["CA"], 15, 98, [2, 7]), rule(["US"], 40, undefined, [5, 10]), rule(["*"], 120, undefined, [7, 21])]), // est. except CA
  shop("jacks", "Jack's Surfboards", "https://www.jackssurfboards.com", "US", "USD", false, [rule(["US"], 15, 99, [3, 7]), rule(["CA"], 45, undefined, [5, 12]), rule(["AU"], 120, undefined, [7, 21])]), // est.
  shop("milosport", "Milo Sport", "https://www.milosport.com", "US", "USD", false, [rule(["US"], 10, 50, [2, 6])]),
  shop("shredshop", "Shred Shop", "https://www.shredshop.com", "US", "USD", false, [rule(["US"], 12, 99, [3, 7])], { sports: ["snow", "skate"] }), // est.
  shop("valsurf", "Val Surf", "https://www.valsurf.com", "US", "USD", false, [rule(["US"], 12, 150, [3, 8]), rule(["CA"], 45, undefined, [5, 12])]), // CA est.
  shop("adrenaline", "Boutique Adrenaline", "https://www.boutiqueadrenaline.com", "CA", "CAD", false, [rule(["CA"], 12.5, 100, [4, 7]), rule(["US"], 45, undefined, [5, 12]), rule(["AT", "CH", "DE", "DK", "FR", "GB", "IT", "NL", "NO", "SE", "AU", "NZ", "JP", "SG", "HK"], 130, undefined, [7, 21])]), // non-CA est.
  // ── Europe: shops ──
  shop("route-one", "Route One", "https://www.routeone.co.uk", "GB", "GBP", true, [rule(["GB"], 5.95, 60, [1, 4]), rule(EU, 25, undefined, [4, 10]), rule(["CH"], 35, undefined, [5, 10])]), // est.
  shop("west-site", "West-Site Boardshop", "https://www.west-site.com", "BE", "EUR", true, [rule(["BE"], 7.95, 100, [1, 3]), rule(without(EU, "BE"), 17.5, undefined, [3, 8]), rule(["CH", "GB", "NO", "IS"], 40, undefined, [4, 10]), rule(["CA", "AU", "NZ", "MX"], 90, undefined, [7, 21])], { fixedGrossInEu: true }), // est. except BE
  shop("stoked", "Stoked Boardshop", "https://www.stokedboardshop.be", "BE", "EUR", true, [rule(["BE"], 7.95, 100, [1, 3]), rule(without(EU, "BE"), 17.5, undefined, [3, 8]), rule(["IS"], 40, undefined, [5, 12]), rule(["US"], 75, undefined, [7, 14])], { fixedGrossInEu: true }), // est.
  // ── Australia & Asia: shops ──
  shop("surfstitch", "SurfStitch", "https://www.surfstitch.com", "AU", "AUD", true, [rule(["AU"], 10, 100, [2, 6])]),
  shop("boardworld", "Boardworld", "https://www.boardworld.com.au", "AU", "AUD", true, [rule(["AU"], 15, 79, [2, 6]), rule(["NZ"], 45, undefined, [5, 12])]), // NZ est.
  shop("alpine-beach", "Alpine Beach", "https://www.alpinebeach.com.au", "AU", "AUD", true, [rule(["AU"], 15, 99, [2, 6]), rule(["NZ"], 45, undefined, [5, 12]), rule(["AT", "BE", "CA", "CH", "CZ", "DE", "DK", "ES", "FI", "FR", "GB", "HK", "IE", "IT", "JP", "KR", "MY", "NL", "NO", "PL", "PT", "SE", "SG", "US"], 140, undefined, [7, 21])]), // non-AU est.
  shop("welcome", "Welcome Boardstore", "https://www.welcomeboardstore.com.au", "AU", "AUD", true, [rule(["AU"], 15, 100, [2, 6]), rule(["NZ"], 45, undefined, [5, 12]), rule(["CA", "GB", "US"], 140, undefined, [7, 21])]), // est.
  shop("twelve", "Twelve Board Store", "https://www.twelveboardstore.com.au", "AU", "AUD", true, [rule(["AU"], 12, 90, [1, 5]), rule(["NZ"], 40, undefined, [5, 12]), rule([...EU, "GB", "CH", "NO", "US", "CA", "JP", "SG", "HK", "KR"], 140, undefined, [7, 21])]), // non-AU est.
  shop("sbf", "SBF Boardshop", "https://www.sbfboardshop.com", "HK", "HKD", false, [rule(["HK"], 0, undefined, [1, 3]), rule([...EU, "GB", "CH", "NO", "US", "CA", "AU", "JP", "KR", "SG", "TH", "MY", "ID", "VN", "IN", "AE", "SA", "MX", "MN"], 700, undefined, [7, 21])]), // est.
  shop("skatebruh", "Skatebruh", "https://www.skatebruh.com", "SG", "SGD", true, [rule(["SG"], 6, 80, [1, 4]), rule(["AT", "AU", "BE", "CA", "CH", "DE", "FR", "GB", "IT", "KR", "LU", "MY", "NL", "TH", "TW", "US"], 70, undefined, [7, 21])], { sports: ["skate"] }), // est.
  // ── Brand stores ──
  shop("burton", "Burton", "https://www.burton.com", "US", "USD", false, [rule(["US"], 10, 100, [3, 7]), rule(["CA"], 40, undefined, [5, 12])], { sports: ["snow"] }), // CA est.
  shop("arbor", "Arbor Collective", "https://www.arborcollective.com", "US", "USD", false, [rule(["US"], 15, 100, [3, 7]), rule(["CA"], 45, undefined, [5, 12]), rule([...EU, "GB", "CH", "NO", "AU", "NZ"], 110, undefined, [7, 21])]), // est.
  shop("jones", "Jones Snowboards", "https://www.jonessnowboards.com", "US", "USD", false, [rule(["US"], 15, 100, [3, 7])], { sports: ["snow"] }), // est.
  shop("capita", "CAPiTA", "https://capitasnowboarding.com", "US", "USD", false, [rule(["US"], 15, 100, [3, 7]), rule(["CA"], 40, undefined, [5, 12])], { sports: ["snow"] }), // est.
  shop("crailtap", "Crailtap (Girl / Chocolate)", "https://crailtap.com", "US", "USD", false, [rule(["US"], 8, 75, [3, 7])], { sports: ["skate"] }), // est.
  shop("firewire", "Firewire Surfboards", "https://firewiresurfboards.com", "US", "USD", false, [rule(["US"], 75, undefined, [5, 10]), rule(["CA"], 150, undefined, [7, 14])], { sports: ["surf"], defaultSport: "surf" }), // est. (oversize freight)
  shop("ci", "Channel Islands Surfboards", "https://cisurfboards.com", "US", "USD", false, [rule(["US"], 75, undefined, [5, 10]), rule(["CA"], 150, undefined, [7, 14])], { sports: ["surf"], defaultSport: "surf" }), // est.
  shop("pyzel", "Pyzel Surfboards", "https://www.pyzelsurfboards.com", "US", "USD", false, [rule(["US"], 85, undefined, [5, 10]), rule(["*"], 250, undefined, [10, 30])], { sports: ["surf"], defaultSport: "surf" }), // est. (air cargo)
  shop("bataleon", "Bataleon", "https://bataleon.com", "US", "USD", false, [rule(["US"], 10, 50, [3, 7])], { sports: ["snow"] }),
  shop("nitro", "Nitro Snowboards", "https://nitrosnowboards.com", "DE", "EUR", true, [rule(EU, 15, 150, [3, 8])], { sports: ["snow"], fixedGrossInEu: true }), // EU store; est.
  shop("korua", "Korua Shapes", "https://www.koruashapes.com", "DE", "EUR", true, [
    rule(["DE", "NL", "AT", "BE", "DK", "FR", "IE", "IT", "LU", "MC", "PL", "PT", "SE", "SK", "SI", "ES", "CZ", "HU"], 12, 600, [2, 6]),
    rule(["EE", "FI", "HR", "LV", "LT"], 18, undefined, [3, 8]),
    rule(["BG", "GR", "MT", "RO", "RS", "CY"], 30, undefined, [4, 10]),
    rule(["AD", "IS", "LI", "NO", "CH", "GB"], 40, undefined, [4, 10]),
    rule(["CN", "JP", "SG", "HK", "KR", "TW", "TH", "NZ"], 90, undefined, [7, 14]),
    rule(["AU"], 32, undefined, [7, 14]),
  ], { sports: ["snow"], fixedGrossInEu: true }), // from Korua's posted zone table
  shop("nidecker", "Nidecker", "https://www.nidecker.com", "US", "USD", false, [rule(["US"], 15, 100, [3, 7])], { sports: ["snow"] }), // est.
  shop("polar", "Polar Skate Co.", "https://polarskateco.com", "NL", "EUR", true, [rule(["NL"], 6.95, 100, [1, 3]), rule(without(EU, "NL"), 15, undefined, [3, 8]), rule(["GB", "CH", "NO", "US", "CA", "AU", "JP"], 35, undefined, [5, 14])], { sports: ["skate"], fixedGrossInEu: true }), // est.
  shop("js-industries", "JS Industries", "https://jsindustries.com", "AU", "AUD", true, [rule(["AU"], 60, undefined, [5, 10]), rule(EU, 250, undefined, [10, 30])], { sports: ["surf"], defaultSport: "surf" }), // est.
  shop("hayden", "Haydenshapes", "https://haydenshapes.com", "US", "USD", false, [rule(["US"], 75, undefined, [5, 10]), rule(["CA", "BE", "CH", "DE", "DK", "ES", "FR", "GB", "IT", "NO", "PT", "SE", "JP", "SG", "HK", "KR", "TW", "MX"], 200, undefined, [10, 30])], { sports: ["surf"], defaultSport: "surf" }), // est.
  shop("globe", "Globe", "https://globebrand.com", "US", "USD", false, [rule(["US"], 8, 100, [4, 9])], { sports: ["skate"] }),
  shop("penny", "Penny Skateboards", "https://www.pennyskateboards.com", "US", "USD", false, [rule(["US"], 19.99, undefined, [4, 7]), rule(["*"], 45, undefined, [5, 14])], { sports: ["skate"] }), // intl est.
  shop("impala", "Impala", "https://impalarollerskates.com", "US", "USD", false, [rule(["US"], 10, 99, [3, 9]), rule(["CA"], 35, undefined, [5, 12])], { sports: ["skate"] }), // CA est.
  shop("gentemstick", "Gentemstick", "https://gentemstick.com", "JP", "JPY", true, [rule(["JP"], 550, 5000, [2, 6]), rule([...EU, "GB", "CH", "NO", "US", "CA", "AU", "NZ", "KR", "TW", "HK", "SG", "TH", "CN"], 25000, undefined, [7, 21])], { sports: ["snow", "surf"] }), // intl est.
  shop("evisen", "Evisen Skateboards", "https://shop.evisenskateboards.com", "JP", "JPY", true, [rule(["JP"], 800, 10000, [2, 6])], { sports: ["skate"] }), // est.
];
