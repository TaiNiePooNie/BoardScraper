import { RETAILERS } from "@/lib/retailers";
import type { RetailerAdapter } from "../types";
import { evoAdapter } from "./evo";
import { sitemapJsonLdAdapter } from "./sitemapJsonLd";

export const ADAPTERS: Record<string, RetailerAdapter> = {
  evo: evoAdapter(RETAILERS.evo),
  "blue-tomato": sitemapJsonLdAdapter({
    retailer: RETAILERS["blue-tomato"],
    // en-GB sitemap for discovery; fetch the en-NL page, which shows EU VAT-inclusive EUR prices (en-GB shows ex-VAT).
    sitemaps: ["https://www.blue-tomato.com/en-GB/sitemap-products-1.xml"],
    // Product slugs end with the product type ("…+Skateboard+Deck-664878/"); long slugs are truncated ("+Surfboa-").
    productUrls: {
      snow: /\/product\/[^/]+\+(?:Snowboard|Splitboard)-\d+\/$/,
      skate: /\/product\/[^/]+\+(?:Deck|Complete|Skateb\w*|Surfsk\w*|Cruiser|Longboard)-\d+\/$/,
      surf: /\/product\/[^/]+\+(?:Surf|Surfb\w*|Softboard|Foamie)-\d+\/$/,
    },
    rewriteUrl: (u) => u.replace("/en-GB/", "/en-NL/"),
  }),
  glisshop: sitemapJsonLdAdapter({
    retailer: RETAILERS.glisshop,
    sitemaps: ["https://www.glisshop.com/Assets/Rbs/Seo/sitemap-index.xml"],
    followSitemap: /Rbs_Catalog_Product/,
    // Snow only: Glisshop doesn't sell skateboards or surfboards (only snowskates).
    productUrls: { snow: /glisshop\.com\/planche-de-snowboard\// },
    titlePrefix: /^planche(?: de)? snowboard\s+/i,
    // Embedded price state: "advicePrice":{…"valueWithTax":399.9} is the RRP. The page also
    // carries packs/related products, so take the most frequent plausible value (ties → lowest).
    listPriceFromHtml: (html, price) => {
      const counts = new Map<number, number>();
      for (const m of html.matchAll(/"advicePrice":\{.{0,200}?"valueWithTax":([\d.]+)/g)) {
        const v = Number(m[1]);
        if (v > price && v < price * 3) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const best = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      return best?.[0] ?? null;
    },
  }),
};
