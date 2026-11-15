import robotsParser from "robots-parser";

/**
 * Polite HTTP client for scraping:
 *  • obeys robots.txt (rules for "*" and our bot token)
 *  • per-host minimum delay + jitter
 *  • retries with exponential backoff on network errors / 5xx
 *  • detects blocks (403/429/bot challenges) and stops instead of evading them
 */
export class BlockedError extends Error {}
export class DisallowedError extends Error {}

const BOT_TOKEN = "BoardScraperBot";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const CHALLENGE = /challenges\.cloudflare\.com|cf-chl-|\/\.webscale\/i-am-a-human|<title>\s*(just a moment|attention required|access denied)/i;

export interface FetchResult {
  status: number;
  url: string;
  text: string;
}

export interface FetcherOptions {
  minDelayMs?: number;
  acceptLanguage?: string;
  retries?: number;
  timeoutMs?: number;
}

export class PoliteFetcher {
  private robots = new Map<string, Promise<ReturnType<typeof robotsParser> | null>>();
  private lastHit = new Map<string, number>();
  private queue = new Map<string, Promise<unknown>>();
  readonly opts: Required<FetcherOptions>;
  requests = 0;

  constructor(opts: FetcherOptions = {}) {
    this.opts = {
      minDelayMs: opts.minDelayMs ?? Number(process.env.SCRAPER_MIN_DELAY_MS ?? 2500),
      acceptLanguage: opts.acceptLanguage ?? "en-GB,en;q=0.9",
      retries: opts.retries ?? 3,
      timeoutMs: opts.timeoutMs ?? 30_000,
    };
  }

  private raw(url: string, accept: string) {
    return fetch(url, {
      headers: { "user-agent": UA, accept, "accept-language": this.opts.acceptLanguage },
      redirect: "follow",
      signal: AbortSignal.timeout(this.opts.timeoutMs),
    });
  }

  private loadRobots(origin: string) {
    let p = this.robots.get(origin);
    if (!p) {
      p = this.raw(`${origin}/robots.txt`, "text/plain")
        .then(async (r) => (r.ok ? robotsParser(`${origin}/robots.txt`, await r.text()) : null))
        .catch(() => null);
      this.robots.set(origin, p);
    }
    return p;
  }

  async isAllowed(url: string): Promise<boolean> {
    const robots = await this.loadRobots(new URL(url).origin);
    if (!robots) return true; // no robots.txt → allowed
    return robots.isAllowed(url, BOT_TOKEN) !== false && robots.isAllowed(url, "*") !== false;
  }

  /** Serialize requests per host and enforce the politeness delay. */
  private async throttle<T>(host: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queue.get(host) ?? Promise.resolve();
    const run = prev.catch(() => {}).then(async () => {
      const wait = (this.lastHit.get(host) ?? 0) + this.opts.minDelayMs + Math.random() * 1000 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      try {
        return await fn();
      } finally {
        this.lastHit.set(host, Date.now());
      }
    });
    this.queue.set(host, run);
    return run;
  }

  async get(url: string, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"): Promise<FetchResult> {
    if (!(await this.isAllowed(url))) throw new DisallowedError(`robots.txt disallows ${url}`);
    const host = new URL(url).host;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.opts.retries; attempt++) {
      try {
        const res = await this.throttle(host, () => this.raw(url, accept));
        this.requests++;
        const text = await res.text();
        if (res.status === 403 || res.status === 429 || CHALLENGE.test(text.slice(0, 5000))) {
          throw new BlockedError(`Blocked (${res.status}) at ${url}`);
        }
        if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
        return { status: res.status, url: res.url, text };
      } catch (e) {
        if (e instanceof BlockedError) throw e;
        lastErr = e;
        if (attempt < this.opts.retries) await new Promise((r) => setTimeout(r, 2 ** attempt * 3000));
      }
    }
    throw lastErr;
  }

  async getJson<T>(url: string): Promise<T> {
    const r = await this.get(url, "application/json");
    if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}`);
    return JSON.parse(r.text) as T;
  }
}

/** All <loc> URLs in a sitemap / sitemap index. */
export const sitemapLocs = (xml: string) =>
  [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)/g)].map((m) => m[1].replace(/&amp;/g, "&"));
