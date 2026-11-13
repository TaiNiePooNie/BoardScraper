import { NextResponse, type NextRequest } from "next/server";
import { repository } from "@/lib/data/repository";
import { buildDeals } from "@/lib/deals";
import { resolveLocale } from "@/lib/geo";
import { RiderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/deals?weightKg=&heightCm=&bootSize=&bootSystem=&style=&country=&currency=
 * Rider params are optional; without them all deals are returned ungated by size.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const locale = resolveLocale(req.headers, { country: q.get("country"), currency: q.get("currency") });

  let rider = null;
  if (q.has("weightKg")) {
    const parsed = RiderInput.safeParse(Object.fromEntries(q));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    rider = parsed.data;
  }

  const catalog = await repository.getCatalog();
  return NextResponse.json(buildDeals(catalog, locale, rider));
}
