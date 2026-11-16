import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * DATABASE_URL=postgres://…  → hosted Postgres (prod, GitHub Actions)
 * DATABASE_URL=pglite:<dir>  → embedded Postgres in a local folder (dev, no install)
 * DATABASE_URL=pglite:memory → in-memory (tests)
 */
export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export interface DbHandle {
  db: DB;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

export async function openDb(url = process.env.DATABASE_URL): Promise<DbHandle> {
  if (!url) throw new Error("DATABASE_URL is not set");

  if (url.startsWith("pglite:")) {
    const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
      import("@electric-sql/pglite"), import("drizzle-orm/pglite"), import("drizzle-orm/pglite/migrator"),
    ]);
    const target = url.slice("pglite:".length);
    const client = target === "memory" ? new PGlite() : new PGlite(path.resolve(target));
    const db = drizzle(client, { schema });
    return { db: db as unknown as DB, migrate: () => migrate(db, { migrationsFolder }), close: () => client.close() };
  }

  const [{ default: postgres }, { drizzle }, { migrate }] = await Promise.all([
    import("postgres"), import("drizzle-orm/postgres-js"), import("drizzle-orm/postgres-js/migrator"),
  ]);
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const client = postgres(url, { max: 8, prepare: false, ssl: local ? false : "require", onnotice: () => {} });
  const db = drizzle(client, { schema });
  return { db: db as unknown as DB, migrate: () => migrate(db, { migrationsFolder }), close: () => client.end() };
}

/** Process-wide handle for the web app (shared with Better Auth). */
export const getDb = async (): Promise<DB> => (await import("./server")).serverDb();
