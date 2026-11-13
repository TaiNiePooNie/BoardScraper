import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

/**
 * Browser factory tuned to look like a normal desktop visitor:
 * realistic UA/locale/timezone/viewport, navigator.webdriver hidden,
 * human-ish jitter between navigations, and per-host rate limiting.
 * We do NOT solve CAPTCHAs or defeat access controls — if a site serves a
 * challenge we back off and report it. Respect each retailer's robots.txt/ToS.
 */

const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
];

export interface ContextOptions {
  locale?: string; // "de-DE"
  timezoneId?: string; // "Europe/Berlin"
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

export async function newStealthContext(browser: Browser, opts: ContextOptions = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    userAgent: UAS[Math.floor(Math.random() * UAS.length)],
    locale: opts.locale ?? "en-US",
    timezoneId: opts.timezoneId ?? "Europe/Berlin",
    viewport: { width: 1366 + Math.floor(Math.random() * 200), height: 820 + Math.floor(Math.random() * 120) },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  // Skip heavy assets we don't parse (keeps us light on retailer bandwidth).
  await ctx.route("**/*", (route) => {
    const t = route.request().resourceType();
    return t === "font" || t === "media" ? route.abort() : route.continue();
  });
  return ctx;
}

const lastHit = new Map<string, number>();
const MIN_DELAY = Number(process.env.SCRAPER_MIN_DELAY_MS ?? 2500);

/** Per-host politeness delay + jitter. */
async function throttle(url: string) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + MIN_DELAY + Math.random() * 1500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}

export class BlockedError extends Error {}

/** Navigate with throttling, retries w/ exponential backoff, and challenge detection. */
export async function gotoSafe(page: Page, url: string, retries = 3): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle(url);
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const status = res?.status() ?? 0;
      const title = (await page.title()).toLowerCase();
      if (status === 403 || status === 429 || /just a moment|access denied|captcha/.test(title)) {
        throw new BlockedError(`Blocked (${status}) at ${url}`);
      }
      if (status >= 500) throw new Error(`HTTP ${status}`);
      return;
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 4000));
    }
  }
}
