import type { BoardModel, Listing, Retailer } from "../types";
import { buildMockCatalog } from "./mock";

/**
 * Storage abstraction. MockRepository today; a Prisma-backed implementation
 * (see prisma/schema.prisma) slots in behind the same interface.
 */
export interface CatalogRepository {
  getCatalog(): Promise<{ boards: BoardModel[]; listings: Listing[]; retailers: Retailer[] }>;
}

class MockRepository implements CatalogRepository {
  private cache = buildMockCatalog();
  async getCatalog() {
    return this.cache;
  }
}

export const repository: CatalogRepository = new MockRepository();
