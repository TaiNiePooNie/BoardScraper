import { promises as fs } from "node:fs";
import path from "node:path";
import type { PricePoint } from "@/lib/types";
import type { ScrapedProduct } from "./retailers/base";

/**
 * Interim JSON store: data/products.json (latest snapshot) and
 * data/history.json (one PricePoint per listing per day).
 * Replace with Prisma (prisma/schema.prisma) when the DB is provisioned.
 */
const DIR = path.resolve(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, file), "utf8"));
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, data: unknown) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, file), JSON.stringify(data, null, 2));
}

export const listingKey = (retailerId: string, url: string) => `${retailerId}::${url}`;

export async function saveSnapshot(retailerId: string, products: ScrapedProduct[]) {
  const all = await readJson<Record<string, ScrapedProduct>>("products.json", {});
  const history = await readJson<Record<string, PricePoint[]>>("history.json", {});
  const today = new Date().toISOString().slice(0, 10);

  for (const p of products) {
    const key = listingKey(retailerId, p.url);
    all[key] = p;
    const h = (history[key] ??= []);
    const point = { date: today, price: p.price, inStock: p.sizes.some((s) => s.inStock) };
    const last = h[h.length - 1];
    if (last?.date === today) h[h.length - 1] = point; // one point per day
    else h.push(point);
  }
  await writeJson("products.json", all);
  await writeJson("history.json", history);
}
