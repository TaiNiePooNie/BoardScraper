# BoardBuddy (repo: BoardScraper)

Snowboard deal finder that feels like browsing a streetwear snowboard shop: a short rider setup (size, boots, style, skill, budget) picks your ideal board, then live deals from real shops hang on shop walls. Every deal is graded against MSRP and price history and priced to your door (shipping, VAT, duties).

Stack: Next.js 15 (App Router) · React 19 · Tailwind v4 · TanStack Table · Recharts · Zod · Drizzle ORM (Postgres / PGlite) · Vitest.

```bash
npm install
npm run dev                     # demo mode (mock data) when DATABASE_URL is unset

# Live data, local embedded Postgres (no install):
export DATABASE_URL=pglite:./data/pglite
npm run scrape -- --limit=20    # migrate + scrape all retailers (cap per retailer)
npm run db:stats                # catalog + recent runs
npm run dev

npm run scrape -- --retailer=evo --dry-run   # parse only, print, no DB
npm run scrape -- --retailer=evo --sport=skate,surf --dry-run --limit=5   # one or more sports (limit = per sport)
npm test                        # unit + ingest tests (in-memory PGlite)
```

## Retailers

| id | Shop | Region | Sports | Source |
|---|---|---|---|---|
| `evo` | evo.com | US (USD, ex. tax) | snow, skate, surf | Generic Shopify adapter, public collection JSON (price, compare-at, per-size stock). Collections: `snowboards`, `skateboard-decks`, `skateboard-completes`, `cruiser-skateboards`, `longboard-skateboard-completes`, `surfboards` (bundles/packages, used and blem boards skipped) |
| `blue-tomato` | blue-tomato.com | AT → EU (EUR incl. VAT) | snow, skate, surf | Sitemap (filtered by the product-type suffix of the URL) → schema.org ProductGroup JSON-LD + breadcrumbs; width / length / volume from the page's feature list; RRP from `og:price:standard_amount` |
| `glisshop` | glisshop.com | FR → EU (EUR incl. VAT) | snow | Sitemap → schema.org ProductGroup JSON-LD; RRP from embedded `advicePrice` |

Every path used is allowed by the shop's robots.txt; the fetcher checks robots.txt at runtime, waits ≥ 2.5 s between requests per host, and stops on 403/429/bot challenges instead of evading them. Excluded after review (blocking or disallowed): Snowleader, Sport Conrad, Absolute-Snow, The House, Snowboard Asylum; Bergzeit and Tradeinn need different discovery/parsing (see `src/lib/retailers.ts`). Shipping rules in `src/lib/retailers.ts` are estimates — verify each season.

Adding retailers: `npm run survey [-- id,id]` (`scripts/survey-retailers.ts`) prints one line per candidate shop/brand store — platform (Shopify `/products.json`, sitemap + JSON-LD, other), robots.txt verdict for the feed/product paths, HTTP status. Shopify shops plug into the generic `shopifyAdapter` (`src/scraper/retailers/shopify.ts`): whole-catalogue `/products.json` paging with board/gear classification from `product_type` → title → tags (`classifyShopifySport`), or explicit board `collections`; prices in the shop's base currency (checked against `/meta.json`). Sitemap shops use `sitemapJsonLdAdapter` with per-sport product-URL regexes.

## App

A light, modern web store for **snowboards, skateboards and surfboards** (`src/components/store/`, view model in `src/lib/store.ts`).

- **Header**: sport switch (Snow · Skate · Surf), search, "Find my size", saved boards, profile. Phones get a bottom bar (Shop, Saved, My size, Profile).
- **Shop**: hero per sport, "Shop by type" tiles, product grid (24 at a time, "Show more"), filter & sort sheet (fits me, on sale, gender, max price, brand, shop).
- **Price badges** instead of deal tiers: −% off, "Lowest in 90 days", "Price dropped", "Last season", "Fits you". Prices are delivered prices (shipping, VAT, duties) for the chosen country.
- **Product page** (`?board=<id>`, works with the back button): photo gallery, sizes with yours highlighted, compare shops, price history, details and board stats, sticky "Buy at shop" bar.
- **Find my size** (`SizeSheet`): one sheet for all sports with the Buddy flipbook preview. Snow: length from weight, skill, style, wide boots. Skate: deck width from shoe size and riding style. Surf: volume from weight × skill factor and wave size (plus a length range). Logic in `src/lib/sizing.ts` (`recommendFor`, `matchSizesFor`).
- **Riders & buddies**, **accounts** (Better Auth), **deal alert emails**, **live price check** and **owner-only restock** (footer link) work as before.
- **Static test build**: `DATABASE_URL=pglite:./data/pglite npm run build:static -- out.html`.

## Database & scheduled scraping

- Schema: `src/db/schema.ts` (Drizzle) → migrations in `drizzle/` (`npm run db:generate` after schema edits). The same migrations run on hosted Postgres and PGlite.
- Ingest (`src/scraper/ingest.ts`): canonical board per sport + brand + model + season (cross-shop matching; skate also per type, so a deck and a complete don't merge), board `sport` + `category`, sizes with skate deck width (`width_in`) and surf volume (`volume_l`), listing per URL, per-size price/stock, one price point per listing per day (lowest), review sources, MSRP (best RRP, else highest observed), denormalized tier/score. Listings missing from a complete run are deactivated; partial/blocked runs never deactivate.
- **GitHub Actions** (`.github/workflows/scrape.yml`): daily 04:17 UTC + manual dispatch (optional retailer/limit). Migrates once, scrapes each retailer in parallel, writes a stats summary to the run page. Requires repository secret **`DATABASE_URL`** (hosted Postgres).
- CI (`.github/workflows/ci.yml`): typecheck, tests, build on PRs and `main`.
- Deploying the web app: set the same `DATABASE_URL`; the API reads the catalog (60 s in-process cache).

## Layout

| Path | What |
|---|---|
| `src/lib/types.ts` | Zod domain schemas: rider input, board/listing/retailer, price history, deal grade, landed cost, ambassadors |
| `src/lib/sizing.ts` | Weight-driven length, strict Wide rule (≥ US 11 / EU 44.5), style → flex/profile |
| `src/lib/grading.ts` | Score 0–100 (MSRP drop + position vs all-time low / 90-day median) → 5 strict tiers |
| `src/lib/pricing/` | FX, VAT table, intra-EU OSS vs export/import VAT + duty, shipping rules → delivered total |
| `src/lib/geo.ts` | Country/currency from edge geo headers → Accept-Language → default |
| `src/lib/deals.ts` | Pipeline: listing → stats → grade → landed cost → rider size/style fit |
| `src/lib/data/` | `CatalogRepository`: `DbRepository` (Drizzle) when `DATABASE_URL` is set, else mock |
| `src/lib/retailers.ts` | Retailer config: country, currency, VAT policy, shipping rules |
| `src/db/` | Drizzle schema, client (Postgres or PGlite), migrate, stats |
| `src/app/api/deals` | `GET /api/deals?sport&weightKg&heightCm&bootSize&bootSystem&style&skateStyle&waves&country&currency` (`sport` = snow, skate or surf; all when omitted) |
| `src/components/` | Rider form, tier tabs, filter panel, card grid (carousel + zoom lightbox + price chart), sortable table |
| `src/scraper/` | Polite fetcher (`http.ts`), parsers (sizes, specs EN/FR/DE, names), retailer adapters, ingest, CLI; Playwright context (`browser.ts`) kept for future JS-only shops |
| `ui-art-requests.md` | Branding/UI art briefs for the design agent → files land in `public/assets/` |

## Notes

- Mock brands, models, riders and retailers are fictional placeholders.
- The scraper does not solve CAPTCHAs or circumvent access controls; it backs off when blocked. Review each retailer's robots.txt/ToS before adding one.
- Specs (profile/shape/flex/style) are keyword-extracted from shop copy and can be missing; unknown specs score neutral in style fit.
- Pro-rider (ambassador) data isn't scraped yet — tables exist; needs brand team pages as sources.

## Environment variables (Vercel unless noted)

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Everything live (also a GitHub Actions secret) |
| `BETTER_AUTH_SECRET` | Accounts (any long random string) |
| `BETTER_AUTH_URL` / `APP_URL` | Your site URL, e.g. `https://board-buddy-xi.vercel.app` (`APP_URL` also a GitHub secret for email links) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google" (redirect URI `<site>/api/auth/callback/google`) |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | "Continue with Apple" (needs an Apple Developer account) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email sign-in links and deal emails (also GitHub secrets for the alerts job) |
| `OWNER_EMAILS` | Your sign-in email(s), comma-separated: shows the Restock button (Pro mode) to you only |
| `GITHUB_TOKEN` | Restock (fine-grained token, this repo, *Actions: Read and write*) |
| `RESTOCK_PASSCODE` | Optional: lets the restock API be called with a passcode instead of an owner sign-in |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` | Faster builds |
