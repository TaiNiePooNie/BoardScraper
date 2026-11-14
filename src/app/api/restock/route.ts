import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isOwnerEmail, sessionUser } from "@/lib/auth";

/**
 * Owner-only "Restock": starts the scheduled-scrape GitHub workflow on demand.
 * Who may restock: a signed-in owner (confirmed email listed in OWNER_EMAILS),
 * or anyone with RESTOCK_PASSCODE (optional fallback).
 *   GITHUB_TOKEN – fine-grained token for this repo with "Actions: read and write" (required)
 * Optional: GITHUB_REPOSITORY (default TaiNiePooNie/BoardScraper).
 */
export const dynamic = "force-dynamic";

const REPO = process.env.GITHUB_REPOSITORY ?? "TaiNiePooNie/BoardScraper";
const WORKFLOW = "scrape.yml";
const gh = (path: string, init?: RequestInit) =>
  fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

async function latestRun() {
  const res = await gh("/runs?per_page=1");
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const run = (await res.json()).workflow_runs?.[0];
  if (!run) return { state: "idle" as const };
  const state = run.status === "completed" ? "completed" : run.status === "in_progress" ? "in_progress" : "queued";
  return { state, conclusion: run.conclusion, url: run.html_url, startedAt: run.run_started_at };
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET() {
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ state: "idle" });
  try {
    return NextResponse.json(await latestRun());
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
    const current = await latestRun();
    if (current.state === "queued" || current.state === "in_progress") return NextResponse.json(current); // already restocking
    const res = await gh("/dispatches", { method: "POST", body: JSON.stringify({ ref: "main" }), headers: { "content-type": "application/json" } });
    if (!res.ok) return NextResponse.json({ error: `GitHub refused the restock (${res.status}).` }, { status: 502 });
    return NextResponse.json({ state: "queued" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
