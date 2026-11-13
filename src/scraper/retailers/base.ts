import type { Page } from "playwright";
import type { BoardProfile, BoardSize, CurrencyCode, Retailer } from "@/lib/types";

/** Raw product as scraped, before matching to a canonical BoardModel. */
export interface ScrapedProduct {
  url: string;
  brand: string;
  model: string;
  season?: string;
  price: number;
  msrp?: number; // "was"/RRP if the retailer shows it
  currency: CurrencyCode;
  sizes: BoardSize[];
  images: string[];
  profile?: BoardProfile;
  flex?: number;
  rating?: { average: number; count: number };
  scrapedAt: string;
}

/** Implement one per retailer. Keep selectors here, nowhere else. */
export interface RetailerAdapter {
  retailer: Retailer;
  /** Category/listing pages to crawl for product links. */
  listingUrls: string[];
  /** Extract product detail URLs from a listing page; return next-page URL if paginated. */
  parseListing(page: Page): Promise<{ productUrls: string[]; nextPage?: string }>;
  parseProduct(page: Page): Promise<ScrapedProduct | null>;
}

/* ───────── Shared helpers usable by any adapter ───────── */

/** Parses "156W", "158 Wide", "159 (Mid-Wide)" etc. */
export function parseSizeLabel(label: string, inStock = true): BoardSize | null {
  const m = label.match(/(\d{3})(?:\.\d)?\s*(cm)?\s*(w\b|wide|mw|mid[- ]?wide)?/i);
  if (!m) return null;
  const tag = (m[3] ?? "").toLowerCase();
  const waist = tag.startsWith("m") ? "mid-wide" : tag ? "wide" : "regular";
  return { lengthCm: Number(m[1]), waist, label: label.trim(), inStock };
}

/** Parses "€ 1.299,95", "$549.99", "£399" → number. */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const decimals = lastSep >= 0 && cleaned.length - lastSep - 1 === 2;
  const intPart = decimals ? cleaned.slice(0, lastSep) : cleaned;
  const dec = decimals ? cleaned.slice(lastSep + 1) : "0";
  return Number(`${intPart.replace(/[.,]/g, "")}.${dec}`);
}

/** Most shops embed schema.org Product JSON-LD — far more stable than CSS selectors. */
export async function extractJsonLdProduct(page: Page): Promise<Record<string, any> | null> {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent ?? ""));
  for (const raw of blocks) {
    try {
      const data = JSON.parse(raw);
      const nodes: any[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
      const product = nodes.find((n) => [].concat(n["@type"]).includes("Product" as never));
      if (product) return product;
    } catch {
      /* malformed block — skip */
    }
  }
  return null;
}
