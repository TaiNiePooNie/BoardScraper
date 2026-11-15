/**
 * Per-site capture hints for scripts/capture-fixtures.ts (used when the default
 * "pick 5 board-ish URLs from the sitemap" heuristic finds category pages or nothing).
 *
 *  origin   — start here instead of the CANDIDATES url (also lets an id that is not a
 *             candidate, e.g. a brand's separate store host, be captured)
 *  sitemaps — sitemap roots to use instead of robots.txt "Sitemap:" lines
 *  match    — pick sample pages among sitemap URLs matching this (spread over the list)
 *  urls     — extra pages to save (category / shipping pages); fetched before the picks
 *  follow   — from the saved `urls` pages, also save linked pages whose href matches
 *  json     — JSON paths to save (e.g. a Shopify collection feed)
 *  max      — number of sample pages (default 5)
 */
export interface FixtureTarget {
  origin?: string;
  sitemaps?: string[];
  match?: RegExp;
  urls?: string[];
  follow?: RegExp;
  json?: string[];
  max?: number;
  maxSitemaps?: number;
}

export const FIXTURE_TARGETS: Record<string, FixtureTarget> = {
  "absolute-snow-uk": { match: /-snowboards-(?:men|women|kids|boy|girl)-20\d\d$/, max: 6 },
  "city-beach": {
    match: /-(?:complete-skateboard|skateboard-deck|deck|complete-cruiser-skateboard|cruiser|longboard|surfboard)\/\d+-\d+\.html$/i,
    max: 6,
  },
  zumiez: {
    match: /-(?:snowboard(?:-20\d\d)?|20\d\d-snowboard|skateboard-deck|complete-skateboard|cruiser-complete-skateboard|surfboard)\.html$/,
    urls: ["https://www.zumiez.com/shipping-guide"],
    max: 6,
    maxSitemaps: 20,
  },
  "powell-peralta": { match: /-(?:skateboard-deck|complete-skateboard)-(?!blem)[\w-]*\d$/, max: 4 },
  "socal-skateshop": {
    match: /-(?:Deck|Complete|Cruiser|Longboard)[\w-]*\d+(?:-\d+)?x\d+[\w-]*\.html$/i,
    urls: ["https://socalskateshop.com/shipping-and-return-policy.html"],
    max: 5,
  },
  skatehut: {
    match: /-(?:skateboard-deck|deck|complete-skateboard|complete-cruiser|cruiser-skateboard|complete-longboard|surfskate)[\w-]*\.htm$/,
    max: 6,
  },
  skatedeluxe: {
    sitemaps: ["https://www.skatedeluxe.com/en/sitemap_products_en.xml"],
    match: /\/en\/p\/[\w-]*(?:skateboard-deck|complete-board|cruiser|longboard|surfskate|snowboard)[\w-]*_p\d+$/,
    max: 6,
  },
  sickboards: {
    urls: ["https://www.sickboards.nl/en/672-skateboard-decks", "https://www.sickboards.nl/en/702-skateboard-completes", "https://www.sickboards.nl/en/100-longboard-complete"],
    follow: /^https:\/\/www\.sickboards\.nl\/en\/(?:skateboard-decks|skateboard-completes|longboard-complete|[a-z-]*(?:deck|complete|cruiser|surfskate)[a-z-]*)\/\d+-[\w-]+\.html$/,
    max: 4,
  },
  "boardsports-eu": {
    sitemaps: ["https://www.boardsports.eu/sitemap.xml", "https://www.boardsports.eu/sitemap_index.xml"],
    urls: ["https://www.boardsports.eu/arbor-snowboards", "https://www.boardsports.eu/capita-snowboards"],
    follow: /^https:\/\/www\.boardsports\.eu\/[\w-]*(?:snowboard|deck|complete|cruiser|longboard|surfboard)[\w-]*(?:\/\d+)?$/i,
    max: 4,
  },
  chilli: {
    match: /\/shop\/surfboards\/detail\.php\?id=\d+$/,
    urls: ["https://www.chillisurfboards.com/shop/surfboards/", "https://www.chillisurfboards.com/legal/shipping.php"],
    max: 4,
  },
  yonex: { json: ["/collections/snowboards/products.json?limit=50"], urls: ["https://us.yonex.com/collections/snowboards"], max: 0 },
  "santa-cruz": { json: ["/products.json?limit=30", "/collections/all/products.json?limit=30"], max: 0 },
  // The brands' / shops' actual online stores live on other hosts:
  "pukas-shop": { origin: "https://pukassurfshop.com", json: ["/collections/pukas-surfboards/products.json?limit=20", "/meta.json"], max: 0 },
  "jart-shop": { origin: "https://skatemenu.com", json: ["/products.json?limit=20", "/meta.json"], max: 0 },
  "nhs-shop": { origin: "https://nhsskatedirect.com", json: ["/products.json?limit=20", "/meta.json"], max: 0 },
  "xdubai-shop": { origin: "https://xdubaishop.com", json: ["/products.json?limit=20", "/meta.json"], max: 3 },
  "slimes-shop": { origin: "https://www.oceanearthstore.com", json: ["/products.json?limit=20", "/meta.json"], max: 3 },
  "ogasaka-shop": { origin: "https://www.ogasakashop.com", urls: ["https://www.ogasakashop.com/shopbrand/11/"], follow: /\/shopdetail\/\d+/, max: 2 },
};
