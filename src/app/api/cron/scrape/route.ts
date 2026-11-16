import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { scrapeDispatchConfigured, startScrape } from "@/lib/scrape-dispatch";

/**
 * Nightly price check, started by Vercel Cron (vercel.json) at a fixed time.
 * GitHub's own schedule runs hours late, so Vercel starts the GitHub workflow instead;
 * the workflow's schedule stays as a backup and skips itself when this already ran.
 * Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  if (!scrapeDispatchConfigured()) return NextResponse.json({ error: "GITHUB_TOKEN is not set in Vercel." }, { status: 503 });
  try {
    const r = await startScrape();
    console.log(r.started ? "Nightly scrape started." : `Scrape already ${r.state}; not starting another.`);
    return NextResponse.json(r);
  } catch (e) {
    console.error("Nightly scrape failed to start", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
