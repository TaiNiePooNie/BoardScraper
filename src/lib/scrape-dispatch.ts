/**
 * Start the GitHub "Scheduled scrape" workflow (used by Restock and the nightly Vercel cron).
 * Needs GITHUB_TOKEN: fine-grained token for this repo with "Actions: read and write".
 */
const REPO = process.env.GITHUB_REPOSITORY ?? "TaiNiePooNie/BoardScraper";
const WORKFLOW = "scrape.yml";

export const scrapeDispatchConfigured = () => !!process.env.GITHUB_TOKEN;

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

export interface RunState { state: "idle" | "queued" | "in_progress" | "completed"; conclusion?: string | null; url?: string; startedAt?: string }

export async function latestScrapeRun(): Promise<RunState> {
  const res = await gh("/runs?per_page=1");
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const run = (await res.json()).workflow_runs?.[0];
  if (!run) return { state: "idle" };
  const state = run.status === "completed" ? "completed" : run.status === "in_progress" ? "in_progress" : "queued";
  return { state, conclusion: run.conclusion, url: run.html_url, startedAt: run.run_started_at };
}

/** Start a full scrape unless one is already queued or running. */
export async function startScrape(): Promise<RunState & { started: boolean }> {
  const current = await latestScrapeRun();
  if (current.state === "queued" || current.state === "in_progress") return { ...current, started: false };
  const res = await gh("/dispatches", { method: "POST", body: JSON.stringify({ ref: "main" }), headers: { "content-type": "application/json" } });
  if (!res.ok) throw new Error(`GitHub refused to start the scrape (${res.status}).`);
  return { state: "queued", started: true };
}
