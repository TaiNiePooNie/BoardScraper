import type { Page } from "playwright";
import type { CurrencyCode, Retailer } from "@/lib/types";
import { extractJsonLdProduct, parsePrice, parseSizeLabel, type RetailerAdapter, type ScrapedProduct } from "./base";

/**
 * Generic adapter for shops exposing schema.org Product JSON-LD.
 * Per-retailer config supplies the listing URLs and a product-link selector;
 * size/variant selectors are optional overrides.
 */
export interface JsonLdRetailerConfig {
  retailer: Retailer;
  listingUrls: string[];
  productLinkSelector: string;
  nextPageSelector?: string;
  sizeOptionSelector?: string; // e.g. 'select[name="size"] option'
  wasPriceSelector?: string; // strike-through RRP
}

export function createJsonLdAdapter(cfg: JsonLdRetailerConfig): RetailerAdapter {
  return {
    retailer: cfg.retailer,
    listingUrls: cfg.listingUrls,

    async parseListing(page: Page) {
      const productUrls = await page.$$eval(cfg.productLinkSelector, (as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).href))]);
      const nextPage = cfg.nextPageSelector
        ? await page.$eval(cfg.nextPageSelector, (a) => (a as HTMLAnchorElement).href).catch(() => undefined)
        : undefined;
      return { productUrls, nextPage };
    },

    async parseProduct(page: Page): Promise<ScrapedProduct | null> {
      const ld = await extractJsonLdProduct(page);
      if (!ld) return null;

      const offers: any[] = [].concat(ld.offers?.offers ?? ld.offers ?? []);
      const prices = offers.map((o) => Number(o.price ?? o.lowPrice)).filter(Number.isFinite);
      if (!prices.length) return null;
      const currency = (offers[0]?.priceCurrency ?? cfg.retailer.currency) as CurrencyCode;

      // Sizes: prefer explicit variant selector, else offer names/skus.
      let sizeLabels: Array<{ label: string; inStock: boolean }> = [];
      if (cfg.sizeOptionSelector) {
        sizeLabels = await page.$$eval(cfg.sizeOptionSelector, (opts) =>
          opts.map((o) => ({ label: o.textContent ?? "", inStock: !(o as HTMLOptionElement).disabled })),
        );
      } else {
        sizeLabels = offers.map((o) => ({ label: String(o.name ?? o.sku ?? ""), inStock: !/OutOfStock/i.test(o.availability ?? "") }));
      }
      const sizes = sizeLabels.map((s) => parseSizeLabel(s.label, s.inStock)).filter((s) => s !== null);

      const wasText = cfg.wasPriceSelector ? await page.$eval(cfg.wasPriceSelector, (e) => e.textContent ?? "").catch(() => "") : "";
      const images = [].concat(ld.image ?? []).map((i: any) => (typeof i === "string" ? i : i.url)).filter(Boolean);
      const brand = typeof ld.brand === "string" ? ld.brand : ld.brand?.name ?? "";

      return {
        url: page.url(),
        brand,
        model: String(ld.name ?? "").replace(new RegExp(`^${brand}\\s*`, "i"), "").trim(),
        price: Math.min(...prices),
        msrp: parsePrice(wasText) ?? undefined,
        currency,
        sizes,
        images,
        rating: ld.aggregateRating
          ? { average: Number(ld.aggregateRating.ratingValue), count: Number(ld.aggregateRating.reviewCount ?? ld.aggregateRating.ratingCount ?? 0) }
          : undefined,
        scrapedAt: new Date().toISOString(),
      };
    },
  };
}
