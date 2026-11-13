# UI Art Requests

Requests for the design agent. Place every delivered file in **`/public/assets/`** using the **exact filename** in each heading — the code already references these paths (`src/lib/assets.ts`). Until a file exists the UI hides that slot.

**Global brand direction (applies to every asset):**
- Brand name: **BoardScraper**. Tone: sharp, data-savvy, alpine — think "precision instrument for powder hunters", not "cartoon ski shop".
- Core palette: Ink `#0B1220` (dark base), Snow `#F6F8FB` (light base), Glacier `#38BDF8` (accent). Tier colors: Extremely Good `#10B981`, Very Good `#22C55E`, Good `#0EA5E9`, Normal `#94A3B8`, Bad `#F43F5E`.
- Must read well on both light (`#F6F8FB`) and dark (`#0B1220`) backgrounds unless stated otherwise.
- No real brand logos, real athletes, trademarks, or legible third-party text. No snowboard product photography (product images are scraped).
- Deliver PNG with transparent background unless the spec says JPG.

---

### Asset Required: logo-wordmark.png
- **Purpose:** Primary logo in the top-left of the site header, overlaid on the hero background image.
- **Dimensions:** 720x144 (5:1), transparent background; rendered at 36px tall.
- **Style/Theme:** Minimalist, geometric sans-serif wordmark, flat vector look, white/Snow lettering with Glacier `#38BDF8` accent.
- **Specific Instructions:** Render the word "BoardScraper" in a bold, slightly condensed geometric sans. Integrate one subtle motif: either the "S" stylized as a carved snowboard turn line, or a small downward-trending price-chart line forming a mountain ridge above "Board". Lettering in pure white `#FFFFFF` so it reads on a dark photo; accent element in `#38BDF8`. Keep it crisp and legible at 36px height — no thin hairlines, no gradients, no drop shadows.

### Asset Required: logo-mark.png
- **Purpose:** Compact square brand mark for mobile header, favicon source, and loading states.
- **Dimensions:** 512x512, transparent background.
- **Style/Theme:** Flat vector icon, geometric, same visual language as logo-wordmark.png.
- **Specific Instructions:** A standalone symbol (no text) combining a snowboard silhouette seen from above, angled ~30°, with a descending price-chart line / mountain ridge cutting across it. Use Glacier `#38BDF8` as the primary fill and Ink `#0B1220` as the secondary. Must remain recognizable at 32x32. Center within the canvas with ~10% padding.

### Asset Required: favicon.png
- **Purpose:** Browser tab icon (referenced in `<head>`).
- **Dimensions:** 64x64, transparent background.
- **Style/Theme:** Simplified version of logo-mark.png, ultra-minimal flat vector.
- **Specific Instructions:** Reduce logo-mark.png to its two strongest shapes so it reads at 16x16. Glacier `#38BDF8` on transparent with an Ink `#0B1220` element. No fine detail.

### Asset Required: hero-background.jpg
- **Purpose:** Full-bleed background behind the header/hero (headline + intro text). A dark gradient overlay (`#0B1220` 70%→40%→page background) is applied on top in CSS, so text sits on the upper-left area.
- **Dimensions:** 2560x1200 (JPG, ≤ 400 KB, progressive).
- **Style/Theme:** Cinematic, atmospheric alpine landscape; cool blue-hour palette leaning into Ink and Glacier tones; photographic-realistic or high-end digital painting.
- **Specific Instructions:** Wide panorama of steep snowy mountain ridges at dusk/blue hour with fresh powder and a few carved snowboard tracks curving down a slope on the right third of the frame. Keep the left 55% of the image calm and low-detail (sky / soft slope) so white headline text stays readable. No people, no logos, no text, no lens flares. The bottom 20% should fade toward a soft light snow tone so it blends into the page background.

### Asset Required: tier-extremely-good.png
- **Purpose:** Icon in the "Extremely Good" deal tab and in deal tier badges.
- **Dimensions:** 128x128, transparent background (rendered at 16–20px).
- **Style/Theme:** Flat vector, single-weight geometric icon set (all five tier icons must share stroke weight, corner radius and grid).
- **Specific Instructions:** A bold three-peak mountain summit with a small sparkle/star at the top peak, filled in `#10B981`. Conveys "top of the mountain / best possible". Must be legible at 16px — thick shapes, no thin lines.

### Asset Required: tier-very-good.png
- **Purpose:** Icon in the "Very Good" deal tab and badges.
- **Dimensions:** 128x128, transparent background (rendered at 16–20px).
- **Style/Theme:** Same icon set as tier-extremely-good.png.
- **Specific Instructions:** A two-peak mountain silhouette with an upward chevron above it, filled in `#22C55E`. Clearly a step below the "Extremely Good" icon visually (fewer peaks, no sparkle).

### Asset Required: tier-good.png
- **Purpose:** Icon in the "Good" deal tab and badges.
- **Dimensions:** 128x128, transparent background (rendered at 16–20px).
- **Style/Theme:** Same icon set as tier-extremely-good.png.
- **Specific Instructions:** A single rounded mountain peak with a simple checkmark integrated into the slope, filled in `#0EA5E9`.

### Asset Required: tier-normal.png
- **Purpose:** Icon in the "Normal" deal tab and badges.
- **Dimensions:** 128x128, transparent background (rendered at 16–20px).
- **Style/Theme:** Same icon set as tier-extremely-good.png.
- **Specific Instructions:** A flat horizon line / gentle plateau (like a groomed flat run) with a small horizontal "equals" mark, filled in `#94A3B8`. Neutral, unremarkable feel.

### Asset Required: tier-bad.png
- **Purpose:** Icon in the "Bad" deal tab and badges.
- **Dimensions:** 128x128, transparent background (rendered at 16–20px).
- **Style/Theme:** Same icon set as tier-extremely-good.png.
- **Specific Instructions:** A small mountain with a downward-pointing warning chevron or a cracked ice shard beneath it, filled in `#F43F5E`. Should read as "caution / overpriced" without being alarming (no skulls, no exclamation-heavy styling).

### Asset Required: style-park.png
- **Purpose:** Icon on the "Park" button in the rider form's Riding Style selector.
- **Dimensions:** 128x128, transparent background (rendered at 28px).
- **Style/Theme:** Flat vector, duotone (Ink `#0B1220` + Glacier `#38BDF8`), one consistent set with the other two style icons. Must also read on dark backgrounds — add a thin `#F6F8FB` outline or choose shapes that stay visible on `#0B1220`.
- **Specific Instructions:** A snowboard sliding along a rail or launching off a kicker with motion lines. Simple, iconic, no rider figure details beyond a minimal silhouette if needed.

### Asset Required: style-all-mountain.png
- **Purpose:** Icon on the "All-Mountain" button in the Riding Style selector.
- **Dimensions:** 128x128, transparent background (rendered at 28px).
- **Style/Theme:** Same duotone set as style-park.png.
- **Specific Instructions:** A snowboard on a groomed slope with a smooth S-shaped carve trail, mountain range behind. Balanced, versatile feel.

### Asset Required: style-freeride.png
- **Purpose:** Icon on the "Freeride" button in the Riding Style selector.
- **Dimensions:** 128x128, transparent background (rendered at 28px).
- **Style/Theme:** Same duotone set as style-park.png.
- **Specific Instructions:** A directional snowboard plunging down a steep powder face with a spray/plume of snow, jagged peak behind. Conveys depth, speed and big lines.

### Asset Required: empty-state-no-deals.png
- **Purpose:** Illustration shown in the results area when a tier tab or filter combination returns no deals.
- **Dimensions:** 640x480, transparent background (rendered at 160px tall).
- **Style/Theme:** Friendly minimalist flat illustration, limited palette (Ink, Glacier, Snow, Normal grey `#94A3B8`), must work on light and dark backgrounds.
- **Specific Instructions:** A lone snowboard stuck upright in a snowbank next to an empty chairlift chair, with a small magnifying glass lying in the snow. Light, slightly humorous "nothing here yet" mood. No text.

### Asset Required: og-image.png
- **Purpose:** Social share preview (Open Graph/Twitter card) for links to the site.
- **Dimensions:** 1200x630, opaque background.
- **Style/Theme:** Bold, clean marketing composition; dark Ink `#0B1220` background with Glacier accents; consistent with hero-background.jpg.
- **Specific Instructions:** Left half: the BoardScraper wordmark (as in logo-wordmark.png) above the tagline "Snowboard deals, sized for you." in white. Right half: a stylized, abstract price-history line chart descending into a mountain ridge, with five small colored dots in the tier colors (`#10B981`, `#22C55E`, `#0EA5E9`, `#94A3B8`, `#F43F5E`). Keep all text inside a 1100x530 safe area.
