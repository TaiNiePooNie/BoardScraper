import { afterEach, describe, expect, it, vi } from "vitest";

describe("daily cron", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("refuses calls without the cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    const { GET } = await import("./cron/scrape/route");
    expect((await GET(new Request("http://x/api/cron/scrape"))).status).toBe(401);
    expect((await GET(new Request("http://x/api/cron/scrape", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
  });
  it("starts the workflow, or leaves a running one alone", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    const calls: string[] = [];
    let status = "completed";
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url.replace(/.*workflows\/scrape\.yml/, "")}`);
      if (url.includes("/runs")) return new Response(JSON.stringify({ workflow_runs: [{ status, conclusion: "success", html_url: "u", run_started_at: "t" }] }));
      return new Response(null, { status: 204 });
    });
    const { GET } = await import("./cron/scrape/route");
    const ok = await GET(new Request("http://x", { headers: { authorization: "Bearer s3cret-value" } }));
    expect(await ok.json()).toMatchObject({ started: true });
    status = "in_progress";
    const busy = await GET(new Request("http://x", { headers: { authorization: "Bearer s3cret-value" } }));
    expect(await busy.json()).toMatchObject({ started: false, state: "in_progress" });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual(["POST /dispatches"]);
  });
  it("passes the shop group to the workflow (fast by default)", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (url.includes("/runs")) return new Response(JSON.stringify({ workflow_runs: [] }));
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 204 });
    });
    const { GET } = await import("./cron/scrape/route");
    const auth = { authorization: "Bearer s3cret-value" };
    await GET(new Request("http://x/api/cron/scrape?group=slow", { headers: auth }));
    await GET(new Request("http://x/api/cron/scrape?group=bogus", { headers: auth }));
    expect(bodies).toEqual([{ ref: "main", inputs: { group: "slow" } }, { ref: "main", inputs: { group: "fast" } }]);
  });
});
