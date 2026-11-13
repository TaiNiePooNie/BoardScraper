# BoardScraper

Snowboard deal aggregator: computes a rider's ideal board from weight/boots/style, scrapes retailer listings, grades each deal against MSRP and price history, and shows localized delivered cost.

Stack: Next.js 15 (App Router) · React 19 · Tailwind v4 · TanStack Table · Recharts · Zod · Playwright · Vitest.

```bash
npm install
npm run dev        # http://localhost:3000 (runs on mock data)
npm test           # sizing / grading / VAT / pipeline tests
npm run scrape -- --retailer=example --limit=20
```

## Layout

| Path | What |
|---|---|
| `src/lib/types.ts` | Zod domain schemas: rider input, board/listing/retailer, price history, deal grade, landed cost, ambassadors |
| `src/lib/sizing.ts` | Weight-driven length, strict Wide rule (≥ US 11 / EU 44.5), style → flex/profile |
| `src/lib/grading.ts` | Score 0–100 (MSRP drop + position vs all-time low / 90-day median) → 5 strict tiers |
| `src/lib/pricing/` | FX, VAT table, intra-EU OSS vs export/import VAT + duty, shipping rules → delivered total |
| `src/lib/geo.ts` | Country/currency from edge geo headers → Accept-Language → default |
| `src/lib/deals.ts` | Pipeline: listing → stats → grade → landed cost → rider size/style fit |
| `src/lib/data/` | `CatalogRepository` (mock today; Prisma later — `prisma/schema.prisma`) |
| `src/app/api/deals` | `GET /api/deals?weightKg&heightCm&bootSize&bootSystem&style&country&currency` |
| `src/components/` | Rider form, tier tabs, filter panel, card grid (carousel + zoom lightbox + price chart), sortable table |
| `src/scraper/` | Playwright browser (throttling, retries, block detection), JSON-LD retailer adapter, ambassador/review enrichment, JSON price-history store |
| `ui-art-requests.md` | Branding/UI art briefs for the design agent → files land in `public/assets/` |

## Notes

- Mock brands, models, riders and retailers are fictional placeholders.
- The scraper does not solve CAPTCHAs or circumvent access controls; it backs off when blocked. Review each retailer's robots.txt/ToS before adding it to `src/scraper/retailers/index.ts`.
