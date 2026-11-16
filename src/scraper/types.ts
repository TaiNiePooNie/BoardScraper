import type { BoardCategory, BoardProfile, BoardShape, BoardSize, CurrencyCode, Retailer, RidingStyle, Sport } from "@/lib/types";
import type { PoliteFetcher } from "./http";

export interface BoardSpecs {
  profile: BoardProfile | null;
  shape: BoardShape | null;
  flex: number | null;
  styles: RidingStyle[];
}

/** Raw product as scraped, before matching to a canonical board. */
export interface ScrapedProduct {
  url: string;
  title: string;
  /** Which board sport this product belongs to. */
  sport: Sport;
  /** Board type within the sport (deck, cruiser, fish, powder…); null if unknown. */
  category: BoardCategory | null;
  brand: string;
  model: string;
  season: string;
  /** False when the title had no model year and `season` is the current-season default. */
  seasonKnown: boolean;
  /** Lowest current price across in-stock sizes (all sizes if none in stock). */
  price: number;
  /** Retailer-shown RRP / compare-at price. */
  listPrice: number | null;
  currency: CurrencyCode;
  /** snow: lengthCm/waist · skate: widthIn (+ lengthCm when known, else 0) · surf: lengthCm (+ volumeL). */
  sizes: BoardSize[];
  images: string[];
  specs: BoardSpecs;
  rating: { average: number; count: number } | null;
  scrapedAt: string;
}

export interface CrawlContext {
  http: PoliteFetcher;
  /** Max products per sport. */
  limit: number;
  log: (msg: string) => void;
  /** Only crawl these sports (all the adapter supports when omitted). */
  sports?: readonly Sport[];
  /** Product URLs we already list for this shop: page-by-page adapters re-check these first. */
  knownUrls?: ReadonlySet<string>;
}

/** One per retailer. Yields products as they are parsed so ingest can stream. */
export interface RetailerAdapter {
  retailer: Retailer;
  /** Sports this retailer is crawled for. */
  sports: readonly Sport[];
  /** Fetches one page per product (slow, scheduled less often); catalogue feeds are fast. */
  slow?: boolean;
  crawl(ctx: CrawlContext): AsyncGenerator<ScrapedProduct>;
  /** Re-check one product page (live price check). */
  fetchOne(http: PoliteFetcher, url: string): Promise<ScrapedProduct | null>;
}
