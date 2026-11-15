import { eq, gte } from "drizzle-orm";
import type { DB } from "@/db/client";
import type { BoardModel, CurrencyCode, Listing, Retailer } from "../types";
import { buildMockCatalog } from "./mock";
import { RETAILERS } from "../retailers";

export interface Catalog {
  boards: BoardModel[];
  listings: Listing[];
  retailers: Retailer[];
}

/**
 * Storage abstraction. DATABASE_URL set → Postgres (or PGlite) via Drizzle;
 * unset → deterministic mock catalog so the UI runs with zero setup.
 */
export interface CatalogRepository {
  readonly source: "db" | "mock";
  getCatalog(): Promise<Catalog>;
}

class MockRepository implements CatalogRepository {
  readonly source = "mock" as const;
  private cache = buildMockCatalog();
  async getCatalog() {
    return this.cache;
  }
}

const HISTORY_DAYS = 365;
const CACHE_MS = 60_000;

export class DbRepository implements CatalogRepository {
  readonly source = "db" as const;
  private cached: { at: number; data: Promise<Catalog> } | null = null;

  /** Inject a DB (tests); defaults to the process-wide handle from DATABASE_URL. */
  constructor(private readonly dbProvider: () => Promise<DB> = async () => (await import("@/db/client")).getDb()) {}

  getCatalog(): Promise<Catalog> {
    if (!this.cached || Date.now() - this.cached.at > CACHE_MS) {
      const data = this.load();
      data.catch(() => (this.cached = null));
      this.cached = { at: Date.now(), data };
    }
    return this.cached.data;
  }

  private async load(): Promise<Catalog> {
    const [db, s] = await Promise.all([this.dbProvider(), import("@/db/schema")]);
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);

    const [retailerRows, listingRows] = await Promise.all([
      db.select().from(s.retailers).where(eq(s.retailers.enabled, true)),
      db.query.listings.findMany({
        where: eq(s.listings.active, true),
        with: {
          sizes: true,
          history: { where: gte(s.pricePoints.date, since), orderBy: (p, { asc }) => [asc(p.date)] },
          board: { with: { ambassadors: { with: { rider: true } } } },
        },
      }),
    ]);

    const boards = new Map<string, BoardModel>();
    const listings: Listing[] = [];
    for (const l of listingRows) {
      const b = l.board;
      const id = String(b.id);
      if (!boards.has(id)) {
        boards.set(id, {
          id,
          sport: "snow", // TODO(multi-sport): read boards.sport / boards.category
          category: null,
          brand: b.brand,
          model: b.model,
          season: b.season,
          profile: b.profile,
          shape: b.shape,
          flex: b.flex,
          styles: b.styles,
          msrp: { amount: b.msrpAmount ?? l.priceAmount, currency: (b.msrpCurrency ?? l.priceCurrency) as CurrencyCode },
          images: b.images.length ? b.images : l.images,
          ambassadors: b.ambassadors.map((a) => ({
            id: String(a.rider.id), name: a.rider.name, disciplines: a.rider.disciplines, confidence: a.confidence, sourceUrl: a.sourceUrl ?? undefined,
          })),
          reviews: b.reviewAvg !== null && b.reviewCount ? { average: b.reviewAvg, count: b.reviewCount, sources: [] } : null,
        });
      }
      listings.push({
        id: String(l.id),
        boardId: id,
        retailerId: l.retailerId,
        url: l.url,
        price: { amount: l.priceAmount, currency: l.priceCurrency as CurrencyCode },
        listPrice: l.listPrice,
        sizes: l.sizes
          .map((z) => ({ lengthCm: z.lengthCm, waist: z.waist, label: z.label, inStock: z.inStock, ...(z.price !== null ? { price: z.price } : {}) }))
          .sort((a, b) => a.lengthCm - b.lengthCm),
        history: l.history.map((h) => ({ date: h.date, price: h.price, inStock: h.inStock })),
        lastScrapedAt: l.lastScrapedAt.toISOString(),
      });
    }

    const retailers: Retailer[] = retailerRows.map((r) => ({
      id: r.id, name: r.name, homepage: r.homepage, country: r.country, currency: r.currency as CurrencyCode,
      pricesIncludeVat: r.pricesIncludeVat, shipping: r.shipping,
    }));
    return { boards: [...boards.values()], listings, retailers: withLiveConfig(retailers) };
  }
}

/** Shipping/VAT policy is versioned in code (src/lib/retailers.ts); it wins over the stored snapshot. */
const withLiveConfig = (rows: Retailer[]): Retailer[] => rows.map((r) => RETAILERS[r.id] ?? r);

export const repository: CatalogRepository = process.env.DATABASE_URL ? new DbRepository() : new MockRepository();
