import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseGroup, scrapeDispatchConfigured, startScrape } from "@/lib/scrape-dispatch";

/**
 * Weekly price checks, started by Vercel Cron (vercel.json) at a fixed time:
 * ?group=fast (catalogue-feed shops) and ?group=slow (page-by-page shops) on different days.
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
    const group = parseGroup(new URL(req.url).searchParams.get("group"));
    const r = await startScrape(group);
    console.log(r.started ? `Scrape (${group} shops) started.` : `Scrape already ${r.state}; not starting another.`);
    return NextResponse.json(r);
  } catch (e) {
    console.error("Scrape failed to start", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
