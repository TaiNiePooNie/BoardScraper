import { and, eq, gte, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { BoardCategory, type BoardModel, type CurrencyCode, type Listing, type Retailer, type Sport } from "../types";
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
  /** Whole catalogue, or one sport's (cheaper: the store loads sports separately). */
  getCatalog(sport?: Sport): Promise<Catalog>;
  /** Forget cached catalogues (after a live price check wrote a change). */
  invalidate(): void;
}

class MockRepository implements CatalogRepository {
  readonly source = "mock" as const;
  private cache = buildMockCatalog();
  invalidate() {}
  async getCatalog(sport?: Sport) {
    if (!sport) return this.cache;
    const boards = this.cache.boards.filter((b) => b.sport === sport);
    const ids = new Set(boards.map((b) => b.id));
    return { boards, listings: this.cache.listings.filter((l) => ids.has(l.boardId)), retailers: this.cache.retailers };
  }
}

const HISTORY_DAYS = 365;
const CACHE_MS = 5 * 60_000;

export class DbRepository implements CatalogRepository {
  readonly source = "db" as const;
  private cached = new Map<string, { at: number; data: Promise<Catalog> }>();

  /** Inject a DB (tests); defaults to the process-wide handle from DATABASE_URL. */
  constructor(private readonly dbProvider: () => Promise<DB> = async () => (await import("@/db/client")).getDb()) {}

  invalidate() {
    this.cached.clear();
  }

  getCatalog(sport?: Sport): Promise<Catalog> {
    const key = sport ?? "*";
    const hit = this.cached.get(key);
    if (hit && Date.now() - hit.at <= CACHE_MS) return hit.data;
    const data = this.load(sport);
    data.catch(() => this.cached.delete(key));
    this.cached.set(key, { at: Date.now(), data });
    return data;
  }

  private async load(sport?: Sport): Promise<Catalog> {
    const [db, s] = await Promise.all([this.dbProvider(), import("@/db/schema")]);
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
    const active = sport
      ? and(eq(s.listings.active, true), inArray(s.listings.boardId, db.select({ id: s.boards.id }).from(s.boards).where(eq(s.boards.sport, sport))))
      : eq(s.listings.active, true);

    const [retailerRows, listingRows] = await Promise.all([
      db.select().from(s.retailers).where(eq(s.retailers.enabled, true)),
      db.query.listings.findMany({
        where: active,
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
          sport: b.sport,
          category: b.category && BoardCategory.safeParse(b.category).success ? b.category : null,
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
          .map((z) => ({
            lengthCm: z.lengthCm, waist: z.waist, label: z.label, inStock: z.inStock,
            ...(z.price !== null ? { price: z.price } : {}),
            ...(z.widthIn !== null ? { widthIn: z.widthIn } : {}),
            ...(z.volumeL !== null ? { volumeL: z.volumeL } : {}),
          }))
          .sort((a, b) => a.lengthCm - b.lengthCm || (a.widthIn ?? 0) - (b.widthIn ?? 0)),
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
