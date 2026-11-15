/**
 * Survey candidate retailers before adding them: robots.txt, platform, and
 * whether the paths an adapter would use are allowed. One line per site.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/survey-retailers.ts            # all candidates
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/survey-retailers.ts burton,jones
 *
 * Uses the PoliteFetcher (robots.txt checked, ≥ 2.5 s between requests per host,
 * stops on 403/429/bot challenges). Hosts run in parallel; each host sees at most
 * ~4 requests. Columns: id · platform · robots · status · notes.
 *   platform: shopify (public /products.json), shopify? (Shopify markers but JSON
 *             not available), jsonld (Product JSON-LD on a sitemap product page),
 *             other (platform name when recognisable), -
 *   robots:   ok | no-robots | disallows <paths> | -
 *   status:   HTTP status of the homepage, BLOCKED (site 403/429/challenge) or
 *             NET (connection refused before reaching the site — e.g. an egress
 *             proxy denying the host: not a decision by the site)
 */
import robotsParser from "robots-parser";
import { BlockedError, DisallowedError, PoliteFetcher, sitemapLocs } from "../src/scraper/http";

interface Candidate { id: string; url: string; kind: "shop" | "brand" }

const shop = (id: string, host: string): Candidate => ({ id, url: `https://${host}`, kind: "shop" });
const brand = (id: string, host: string): Candidate => ({ id, url: `https://${host}`, kind: "brand" });

export const CANDIDATES: Candidate[] = [
  shop("evo", "www.evo.com"), shop("tactics", "www.tactics.com"), shop("zumiez", "www.zumiez.com"), shop("ccs", "shop.ccs.com"),
  shop("backcountry", "www.backcountry.com"), shop("boardroom", "www.boardroomshop.com"), shop("freeride-boardshop", "www.freerideboardshop.com"),
  shop("empire", "www.thinkempire.com"), shop("jacks", "www.jackssurfboards.com"), shop("hss", "www.hsssurf.com"),
  shop("socal-skateshop", "www.socalskateshop.com"), shop("milosport", "www.milosport.com"), shop("shredshop", "www.shredshop.com"),
  shop("valsurf", "www.valsurf.com"), shop("adrenaline", "www.boutiqueadrenaline.com"), shop("blue-tomato", "www.blue-tomato.com"),
  shop("skatedeluxe", "www.skatedeluxe.com"), shop("route-one", "www.routeone.co.uk"), shop("titus", "www.titus-shop.com"),
  shop("skatehut", "www.skatehut.co.uk"), shop("west-site", "www.west-site.com"), shop("boardsports-eu", "www.boardsports.eu"),
  shop("pacific", "www.pacific-boardshop.com"), shop("stoked", "www.stokedboardshop.be"), shop("sickboards", "www.sickboards.nl"),
  shop("snowleader", "www.snowleader.com"), shop("glisshop", "www.glisshop.com"), shop("absolute-snow", "www.absolutesnow.com"),
  shop("absolute-snow-uk", "www.absolute-snow.co.uk"), shop("boarderking", "www.boarderking.com"), shop("surfstitch", "www.surfstitch.com"),
  shop("city-beach", "www.citybeach.com"), shop("boardworld", "www.boardworld.com.au"), shop("alpine-beach", "www.alpinebeach.com.au"),
  shop("welcome", "www.welcomeboardstore.com.au"), shop("twelve", "www.twelveboardstore.com.au"), shop("sds", "www.sds.com.au"),
  shop("trigger-bros", "www.triggerbros.com.au"), shop("slimes", "www.slimes.com.au"), shop("ozmosis", "www.ozmosis.com.au"),
  shop("murasaki", "www.murasaki.jp"), shop("sbf", "www.sbfboardshop.com"), shop("skatebruh", "www.skatebruh.com"), shop("xdubai", "www.xdubai.com"),
  brand("burton", "www.burton.com"), brand("lib-tech", "www.lib-tech.com"), brand("arbor", "www.arborcollective.com"),
  brand("jones", "www.jonessnowboards.com"), brand("capita", "www.capitasnowboarding.com"), brand("santa-cruz", "www.santacruzskateboards.com"),
  brand("powell-peralta", "www.powell-peralta.com"), brand("element", "www.elementbrand.com"), brand("crailtap", "www.crailtap.com"),
  brand("firewire", "www.firewiresurfboards.com"), brand("ci", "www.cisurfboards.com"), brand("lost", "www.lostsurfboards.net"),
  brand("pyzel", "www.pyzelsurfboards.com"), brand("roxy", "www.roxy.com"), brand("quiksilver", "www.quiksilver.com"),
  brand("bataleon", "www.bataleon.com"), brand("nitro", "www.nitrosnowboards.com"), brand("korua", "www.koruashapes.com"),
  brand("nidecker", "www.nidecker.com"), brand("salomon", "www.salomon.com"), brand("pukas", "www.pukassurf.com"),
  brand("jart", "www.jartskateboards.com"), brand("palace", "www.palaceskateboards.com"), brand("polar", "www.polarskateco.com"),
  brand("js-industries", "www.jsindustries.com"), brand("dhd", "www.dhdsurf.com"), brand("hayden", "www.haydenshapes.com"),
  brand("chilli", "www.chillisurfboards.com"), brand("globe", "www.globebrand.com"), brand("penny", "www.pennyskateboards.com"),
  brand("impala", "www.impalaskate.com"), brand("gentemstick", "www.gentemstick.com"), brand("yonex", "www.yonex.com"),
  brand("ogasaka", "www.ogasaka-snowboard.com"), brand("evisen", "shop.evisenskateboards.com"),
];

const PLATFORM_MARKERS: Array<[string, RegExp]> = [
  ["shopify?", /cdn\.shopify\.com|Shopify\.theme|shopify-section/i],
  ["salesforce", /demandware|\/on\/demandware\.store|dwanalytics/i],
  ["magento", /Magento_|mage\/cookies|data-mage-init/i],
  ["shopware", /shopware/i],
  ["woocommerce", /woocommerce/i],
  ["bigcommerce", /bigcommerce/i],
  ["prestashop", /prestashop/i],
];

const PATHS = ["/products.json", "/collections/all/products.json", "/products/x", "/collections/x"];

async function survey(c: Candidate, http: PoliteFetcher): Promise<string> {
  const cols = { platform: "-", robots: "-", status: "-", notes: [] as string[] };
  const line = () => [c.id.padEnd(20), c.kind.padEnd(5), cols.platform.padEnd(12), cols.robots.padEnd(28), cols.status.padEnd(8), cols.notes.join("; ")].join(" ");
  try {
    // robots.txt
    const robotsRes = await http.get(`${c.url}/robots.txt`, "text/plain");
    let sitemaps: string[] = [];
    if (robotsRes.status === 200 && /user-agent/i.test(robotsRes.text)) {
      const robots = robotsParser(`${c.url}/robots.txt`, robotsRes.text);
      const blocked = PATHS.filter((p) => robots.isAllowed(`${c.url}${p}`, "BoardScraperBot") === false || robots.isAllowed(`${c.url}${p}`, "*") === false);
      cols.robots = blocked.length ? `disallows ${blocked.join(",")}` : "ok";
      sitemaps = robots.getSitemaps();
    } else cols.robots = "no-robots";

    // homepage
    const home = await http.get(c.url);
    cols.status = String(home.status);
    if (new URL(home.url).host !== new URL(c.url).host) cols.notes.push(`→ ${new URL(home.url).host}`);
    cols.platform = PLATFORM_MARKERS.find(([, re]) => re.test(home.text))?.[0] ?? "other";

    // Shopify public feed
    if (cols.platform === "shopify?" || cols.platform === "other") {
      try {
        const r = await http.get(`${c.url}/products.json?limit=1`, "application/json");
        const j = r.status === 200 && r.text.trimStart().startsWith("{") ? JSON.parse(r.text) : null;
        if (Array.isArray(j?.products)) {
          cols.platform = "shopify";
          const p = j.products[0];
          if (p) cols.notes.push(`type="${p.product_type}"`);
          const meta = await http.get(`${c.url}/meta.json`, "application/json").catch(() => null);
          const cur = meta?.status === 200 ? JSON.parse(meta.text)?.currency : null;
          if (cur) cols.notes.push(`currency=${cur}`);
        } else cols.notes.push(`products.json ${r.status}`);
      } catch (e) {
        if (e instanceof BlockedError) cols.notes.push("products.json BLOCKED");
        else if (e instanceof DisallowedError) cols.notes.push("products.json disallowed");
        else cols.notes.push(`products.json ${(e as Error).message.slice(0, 40)}`);
      }
    }

    // Sitemap + JSON-LD (non-Shopify)
    if (cols.platform !== "shopify" && sitemaps[0]) {
      try {
        const sm = await http.get(sitemaps[0], "application/xml");
        const locs = sitemapLocs(sm.text);
        cols.notes.push(`sitemap ${locs.length} locs`);
        const productLoc = locs.find((l) => /\/(products?|p)\/|\.html$|-p\d+/i.test(l) && !/\.xml/i.test(l));
        if (productLoc) {
          const page = await http.get(productLoc);
          if (/"@type"\s*:\s*"Product(Group)?"/.test(page.text)) cols.platform = "jsonld";
        }
      } catch (e) {
        if (e instanceof BlockedError) throw e;
        cols.notes.push(`sitemap ${(e as Error).message.slice(0, 40)}`);
      }
    }
  } catch (e) {
    if (e instanceof BlockedError) cols.status = "BLOCKED";
    else if (e instanceof DisallowedError) cols.notes.push((e as Error).message);
    else {
      cols.status = "NET";
      const cause = (e as { cause?: { message?: string; code?: string } }).cause;
      cols.notes.push(`no connection: ${(e as Error).message}${cause?.code ? ` (${cause.code})` : ""} — host unreachable or denied by an egress proxy`.slice(0, 100));
    }
  }
  return line();
}

async function main() {
  const only = process.argv[2]?.split(",").map((s) => s.trim());
  const list = only ? CANDIDATES.filter((c) => only.includes(c.id)) : CANDIDATES;
  // No retries: a survey should be light. Fresh fetcher per host keeps robots caches apart.
  const lines = await Promise.all(list.map((c) => survey(c, new PoliteFetcher({ retries: 0, timeoutMs: 20_000 }))));
  console.log(["id".padEnd(20), "kind ", "platform".padEnd(12), "robots".padEnd(28), "status".padEnd(8), "notes"].join(" "));
  for (const l of lines) console.log(l);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
