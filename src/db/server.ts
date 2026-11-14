import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { DB } from "./client";
import * as schema from "./schema";

/**
 * One synchronous database handle per server process (Next.js routes, Better Auth).
 * Same DATABASE_URL rules as openDb(): postgres://… or pglite:<dir>.
 */
let shared: DB | null = null;

export function serverDb(): DB {
  if (shared) return shared;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url.startsWith("pglite:")) {
    const target = url.slice("pglite:".length);
    shared = drizzlePglite(target === "memory" ? new PGlite() : new PGlite(path.resolve(target)), { schema }) as unknown as DB;
  } else {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    shared = drizzlePg(postgres(url, { max: 5, prepare: false, ssl: local ? false : "require", onnotice: () => {} }), { schema }) as unknown as DB;
  }
  return shared;
}
