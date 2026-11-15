import { NextResponse, type NextRequest } from "next/server";
import { repository } from "@/lib/data/repository";
import { buildDeals } from "@/lib/deals";
import { resolveLocale } from "@/lib/geo";
import { RiderInput, Sport } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/deals?sport=&weightKg=&heightCm=&bootSize=&bootSystem=&style=&skateStyle=&waves=&country=&currency=
 * Rider params are optional; without them all deals are returned ungated by size.
 * `sport` (snow | skate | surf) limits deals to that sport; all sports when omitted.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const locale = resolveLocale(req.headers, { country: q.get("country"), currency: q.get("currency") });

  const sportParam = q.get("sport");
  const sport = sportParam ? Sport.safeParse(sportParam) : null;
  if (sport && !sport.success) return NextResponse.json({ error: sport.error.flatten() }, { status: 400 });

  let rider = null;
  if (q.has("weightKg")) {
    const parsed = RiderInput.safeParse(Object.fromEntries(q));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    rider = parsed.data;
  }

  const catalog = await repository.getCatalog();
  const result = buildDeals(catalog, locale, rider, sport?.data);
  const updatedAt = catalog.listings.reduce<string | null>((m, l) => (!m || l.lastScrapedAt > m ? l.lastScrapedAt : m), null);
  return NextResponse.json({ ...result, source: repository.source, updatedAt });
}
