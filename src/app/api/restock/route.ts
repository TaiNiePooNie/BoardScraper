import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isOwnerEmail, sessionUser } from "@/lib/auth";
import { latestScrapeRun, startScrape } from "@/lib/scrape-dispatch";

/**
 * Owner-only "Restock": starts the scheduled-scrape GitHub workflow on demand.
 * Who may restock: a signed-in owner (confirmed email listed in OWNER_EMAILS),
 * or anyone with RESTOCK_PASSCODE (optional fallback).
 *   GITHUB_TOKEN – fine-grained token for this repo with "Actions: read and write" (required)
 * Optional: GITHUB_REPOSITORY (default TaiNiePooNie/BoardScraper).
 */
export const dynamic = "force-dynamic";

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET() {
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ state: "idle" });
  try {
    return NextResponse.json(await latestScrapeRun());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "Restock isn't set up yet: add GITHUB_TOKEN in Vercel." }, { status: 503 });
  }
  // Owners (signed in with a confirmed OWNER_EMAILS address) need no passcode.
  const u = await sessionUser(req.headers).catch(() => null);
  const owner = !!u && u.emailVerified && isOwnerEmail(u.email);
  if (!owner) {
    const pass = process.env.RESTOCK_PASSCODE;
    const body = await req.json().catch(() => ({}));
    if (!pass || typeof body.passcode !== "string" || !same(body.passcode, pass)) {
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return NextResponse.json({ error: "Only the site owner can restock." }, { status: 401 });
    }
  }
  try {
    const { started: _, ...state } = await startScrape("fast"); // fast shops only (cheap); already restocking → current state
    return NextResponse.json(state);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
