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
npm test                        # unit + ingest tests (in-memory PGlite)
```

## Retailers

| id | Shop | Region | Source |
|---|---|---|---|
| `evo` | evo.com | US (USD, ex. tax) | Shopify public collection JSON (price, compare-at, per-size stock) |
| `blue-tomato` | blue-tomato.com | AT → EU (EUR incl. VAT) | Sitemap → schema.org ProductGroup JSON-LD; RRP from `og:price:standard_amount` |
| `glisshop` | glisshop.com | FR → EU (EUR incl. VAT) | Sitemap → schema.org ProductGroup JSON-LD; RRP from embedded `advicePrice` |

Every path used is allowed by the shop's robots.txt; the fetcher checks robots.txt at runtime, waits ≥ 2.5 s between requests per host, and stops on 403/429/bot challenges instead of evading them. Excluded after review (blocking or disallowed): Snowleader, Sport Conrad, Absolute-Snow, The House, Snowboard Asylum; Bergzeit and Tradeinn need different discovery/parsing (see `src/lib/retailers.ts`). Shipping rules in `src/lib/retailers.ts` are estimates — verify each season.

## App

- **Setup flow** (`src/components/shop/setup/`): fit preference, height/weight sliders with a to-scale size preview, boot-size wheel, style and skill cards, budget range. Every number can be typed. Saved on the device.
- **Shop walls** (`src/lib/walls.ts`, `ShopWall`, `RackBoard`): picks for you, sale rack, last season corner, full price wall, slightly over budget, holds, whole shop.
- **Board detail** (`BoardDetail`): pick-up transition, callouts around the board, game-style stats (`src/lib/stats.ts`), delivered price breakdown, other shops, price history, riders and reviews. Swipe or arrow keys to browse.
- **Pro mode**: ship-to and currency, filters, list and deal-tier view.
- **Restock** (`/api/restock`): owner-only button that starts the scrape workflow. Needs Vercel env vars `RESTOCK_PASSCODE` and `GITHUB_TOKEN` (fine-grained token for this repo with *Actions: read and write*).
- **Live price check** (`/api/live/[id]`): opening a board re-checks that one listing at the shop (at most every 15 min per listing).
- **Static test build**: `DATABASE_URL=pglite:./data/pglite npm run build:static -- out.html` makes one self-contained page (art and one photo per board embedded, deals computed in the browser). `--no-photos` skips photos.

## Database & scheduled scraping

- Schema: `src/db/schema.ts` (Drizzle) → migrations in `drizzle/` (`npm run db:generate` after schema edits). The same migrations run on hosted Postgres and PGlite.
- Ingest (`src/scraper/ingest.ts`): canonical board per brand + model + season (cross-shop matching), listing per URL, per-size price/stock, one price point per listing per day (lowest), review sources, MSRP (best RRP, else highest observed), denormalized tier/score. Listings missing from a complete run are deactivated; partial/blocked runs never deactivate.
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
| `src/app/api/deals` | `GET /api/deals?weightKg&heightCm&bootSize&bootSystem&style&country&currency` |
| `src/components/` | Rider form, tier tabs, filter panel, card grid (carousel + zoom lightbox + price chart), sortable table |
| `src/scraper/` | Polite fetcher (`http.ts`), parsers (sizes, specs EN/FR/DE, names), retailer adapters, ingest, CLI; Playwright context (`browser.ts`) kept for future JS-only shops |
| `ui-art-requests.md` | Branding/UI art briefs for the design agent → files land in `public/assets/` |

## Notes

- Mock brands, models, riders and retailers are fictional placeholders.
- The scraper does not solve CAPTCHAs or circumvent access controls; it backs off when blocked. Review each retailer's robots.txt/ToS before adding one.
- Specs (profile/shape/flex/style) are keyword-extracted from shop copy and can be missing; unknown specs score neutral in style fit.
- Pro-rider (ambassador) data isn't scraped yet — tables exist; needs brand team pages as sources.
