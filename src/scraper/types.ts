import type { BoardProfile, BoardShape, BoardSize, CurrencyCode, Retailer, RidingStyle } from "@/lib/types";
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
  sizes: BoardSize[];
  images: string[];
  specs: BoardSpecs;
  rating: { average: number; count: number } | null;
  scrapedAt: string;
}

export interface CrawlContext {
  http: PoliteFetcher;
  limit: number;
  log: (msg: string) => void;
}

/** One per retailer. Yields products as they are parsed so ingest can stream. */
export interface RetailerAdapter {
  retailer: Retailer;
  crawl(ctx: CrawlContext): AsyncGenerator<ScrapedProduct>;
}
