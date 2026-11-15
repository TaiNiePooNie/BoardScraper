import { NextResponse, type NextRequest } from "next/server";
import { toPart } from "@/lib/catalog-wire";
import { repository } from "@/lib/data/repository";
import { Sport } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/catalog?sport=snow|skate|surf&part=0
 * Compact, country-independent catalogue feed in parts (see src/lib/catalog-wire.ts).
 * Cached at the CDN: shops are re-checked once a day, single boards on demand (/api/live).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const sport = Sport.safeParse(q.get("sport"));
  const part = Number(q.get("part") ?? 0);
  if (!sport.success || !Number.isInteger(part) || part < 0) return NextResponse.json({ error: "sport and part required" }, { status: 400 });
  const catalog = await repository.getCatalog(sport.data);
  const body = toPart(catalog, sport.data, part, repository.source);
  if (part >= body.parts) return NextResponse.json({ error: "no such part" }, { status: 404 });
  return NextResponse.json(body, { headers: { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } });
}
