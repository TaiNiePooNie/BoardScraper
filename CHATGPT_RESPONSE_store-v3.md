# CHATGPT_CALL: store-v3

> **ChatGPT / Codex:** follow the handshake in `AGENTS.md`. Read the **Style Bible** in `ui-art-requests.md` first (palette, mascot "Buddy", sticker treatment), plus the **light-theme additions** below. When finished, rename this file to `CHATGPT_RESPONSE_store-v3.md`, append a `## Response` section (every file: name, bytes, dimensions; anything not done exactly), open a PR on branch `art/store-v3` and **merge it into `main` yourself** (no human review needed). Only touch `/public/assets/` and this file.

## What this is for

BoardBuddy becomes a **modern, light-theme web store** for **snowboards, skateboards and surfboards**: white background, a product grid with real product photos (scraped, never drawn), filters, product pages. Buddy and the sticker style stay as the brand's personality, used for sport switches, category tiles, hero banners, the "Find my size" sheet and empty states.

## Light-theme additions to the Style Bible

- **Page background is white (`#FFFFFF`) or Snow `#F5F6F3`.** A Sticker White die-cut border disappears on white, so every sticker asset gets: Sticker White die-cut border **plus a 2 px Asphalt hairline around the outside of that border** (at 512 px size; scale proportionally).
- Accent use on light: Acid `#D4FF3A` as fills (never as text colour), Hot Pink and Ice as secondary fills, Asphalt for outlines.
- Buddy is the same marmot in every sport. For skate and surf he wears the same lime beanie and pink pom-pom (surf: beanie swapped for a lime bucket hat with a pink band; goggles become Ice sunglasses pushed up). Jacket colours as in the snow version unless stated.
- Boards drawn in art are always generic: Acid top with a Hot Pink stripe, no logos or text.

## Size-finder sprites (same engine as `preview-buddy-*`)

The app scrubs frames with sliders and crossfades slim/regular/broad builds, exactly like the snowboard sheets you delivered (`CHATGPT_RESPONSE_size-preview-buddy.md`). **Reuse your snowboard Buddy puppet** (heads, bodies, builds) so all three sports match.

### Surf grid
- 10 frames of **300 × 600**, sheet **3000 × 600**, transparent WebP, quality ~80, ≤ 600 KB.
- Ground line **y = 592**. Buddy centred on **x = 110**, **340 px tall** (boot/foot soles to top of hat) in every frame. He is barefoot in a wetsuit (Man: Asphalt with Acid panels; Woman: Hot Pink with Ice panels; Kid: Ice with Acid panels).
- Surfboard stands on its tail to his right, centred on **x ≈ 222**, seen from the deck: pointed or round nose per frame below, Acid deck, Hot Pink stringer line, white die-cut border, Asphalt outline. **Board length px = ratio × 340**, tail on y = 592.

| Frame | Ratio | Board type look | Buddy's pose (funny, gradual in-betweens) |
|---|---|---|---|
| 0 | 0.95 | short pointy shortboard | Laughing, poking the tiny pointy nose |
| 1 | 1.03 | shortboard | Smirk, one eyebrow up |
| 2 | 1.10 | fish (swallow tail, wider) | Shrug, "fishy?" |
| 3 | 1.17 | fish / hybrid | Leaning in, curious |
| 4 | 1.24 | hybrid | Nodding, paw on the rail |
| 5 | 1.31 | mid-length | **Sweet spot:** big grin, shaka hand |
| 6 | 1.38 | mid-length | **Sweet spot:** proud, paw on hip, sparkle |
| 7 | 1.47 | funboard, round nose | "Whoa", looking up |
| 8 | 1.56 | longboard, round nose | Leaning back holding it, one sweat drop |
| 9 | 1.65 | big longboard / foamie | Straining, tongue out, two sweat drops, wobble lines |

### Skate grid
- 8 frames of **300 × 600**, sheet **2400 × 600**, transparent WebP, quality ~80, ≤ 500 KB.
- Same ground line (y = 592), Buddy on **x = 150**, **440 px tall**, sneakers instead of boots, same jacket as the snowboard persona.
- Buddy **holds a skateboard deck horizontally in front of his belly with both paws, deck seen from above (top view), grip tape Asphalt with a lime outline, wheels visible at each end.** The deck's **width** is what changes: **deck width px = W × 15** for the width W in inches below. The deck's length is fixed at **260 px**, centred on x = 150, at y ≈ 400. Only the width and Buddy's expression change.

| Frame | Deck width W (in) | Width px | Pose |
|---|---|---|---|
| 0 | 7.0 | 105 | Laughing, deck looks like a ruler |
| 1 | 7.5 | 112.5 | Smirk |
| 2 | 7.75 | 116 | Curious squint |
| 3 | 8.0 | 120 | Nodding |
| 4 | 8.25 | 124 | **Sweet spot:** grin, thumbs up over the deck |
| 5 | 8.5 | 127.5 | **Sweet spot:** proud |
| 6 | 9.0 | 135 | "Whoa", deck feels like a table |
| 7 | 10.0 | 150 | Arms stretched wide, sweat drop, cruiser-wide deck |

## Assets

### Asset Required: preview-buddy-surf-{man|woman|kid}-{slim|regular|broad}.webp (9 files)
- **Purpose:** Find-my-size sheet, surf: Buddy next to a surfboard, scrubbed by board length ÷ rider height.
- **Dimensions:** 3000x600 each (10 frames of 300x600), transparent.
- **Style/Theme:** Style Bible + light-theme additions; Surf grid above.
- **Specific Instructions:** Filenames e.g. `preview-buddy-surf-man-slim.webp`. Same registration rules as the snowboard sheets: identical head and face across builds; only widths change.

### Asset Required: preview-buddy-skate-{man|woman|kid}-{slim|regular|broad}.webp (9 files)
- **Purpose:** Find-my-size sheet, skate: Buddy holding a deck, scrubbed by deck width.
- **Dimensions:** 2400x600 each (8 frames of 300x600), transparent.
- **Style/Theme:** Style Bible + light-theme additions; Skate grid above.
- **Specific Instructions:** Filenames e.g. `preview-buddy-skate-kid-broad.webp`. Kid Buddy is also 440 px tall (the app scales kids down).

### Asset Required: preview-buddy-surf-contact.png and preview-buddy-skate-contact.png
- **Purpose:** Review sheets (not used by the app).
- **Dimensions:** 3000x1800 (surf) and 2400x1800 (skate), opaque white background.
- **Specific Instructions:** Same layout as `preview-buddy-contact.png`.

### Asset Required: sport-snow.svg, sport-skate.svg, sport-surf.svg
- **Purpose:** Sport switch in the header (Snow · Skate · Surf), shown 28–40 px.
- **Dimensions:** viewBox 256x256, transparent.
- **Style/Theme:** Sticker icon with light-theme hairline.
- **Specific Instructions:** Snow: snowboard + snowflake. Skate: skateboard seen from below with 4 wheels. Surf: surfboard + small wave. Bold shapes, legible at 28 px, ≤ 15 KB each.

### Asset Required: type-{id}.svg (13 files)
- **Purpose:** Category tiles under the hero ("Shop by type"), shown 64–96 px.
- **Dimensions:** viewBox 256x256, transparent, ≤ 15 KB each.
- **Style/Theme:** Sticker icon with light-theme hairline, generic boards only.
- **Specific Instructions:** One clear silhouette per type:
  - Snow: `type-all-mountain.svg` (twin-ish board + mountain), `type-freestyle.svg` (board mid-spin, motion arcs), `type-powder.svg` (swallowtail board in powder spray), `type-splitboard.svg` (board split in two halves + skins).
  - Skate: `type-deck.svg` (bare deck), `type-complete.svg` (deck with trucks and wheels), `type-cruiser.svg` (short wide cruiser with soft big wheels), `type-longboard.svg` (long drop-through board).
  - Surf: `type-shortboard.svg` (pointy thruster), `type-fish.svg` (swallow-tail fish), `type-midlength.svg` (egg/mid-length), `type-longboard-surf.svg` (long round-nose), `type-foamie.svg` (soft-top with rounded edges).

### Asset Required: hero-snow.webp, hero-skate.webp, hero-surf.webp
- **Purpose:** Home-page hero banner for each sport. The app puts the headline text and a button on the **left 45 %**, so keep that area calm (sky/plain light colour, no busy shapes).
- **Dimensions:** 1600x640, opaque, ≤ 350 KB each. Also a **mobile crop** `hero-{sport}-mobile.webp` 800x800 with the calm area at the **top 40 %**.
- **Style/Theme:** Bright, airy, daylight, light sticker-collage; mostly white/Snow with Acid, Ice and Hot Pink accents. Not dark.
- **Specific Instructions:** Right side: Buddy in action (snow: carving, spray; skate: kickflip over a curb; surf: riding a small clean wave). No text, no logos.

### Asset Required: mascot-skate.png, mascot-surf.png
- **Purpose:** Find-my-size sheet header and sport-specific moments.
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker, light-theme hairline.
- **Specific Instructions:** Skate: Buddy standing with one foot on a skateboard, waving. Surf: Buddy in wetsuit and bucket hat, surfboard under arm, shaka.

### Asset Required: empty-search.png, empty-saved.png
- **Purpose:** Empty states: no search results; no saved boards yet.
- **Dimensions:** 1000x700, transparent.
- **Style/Theme:** Small sticker scene for a white page.
- **Specific Instructions:** Search: Buddy holding a magnifying glass, looking puzzled at an empty board rack. Saved: Buddy hugging an empty heart outline. No text.

### Asset Required: placeholder-snow.png, placeholder-skate.png, placeholder-surf.png
- **Purpose:** Product card fallback when a shop photo fails to load.
- **Dimensions:** 600x800, transparent.
- **Style/Theme:** Flat light-grey (`#E7E8E4`) silhouette of the board type with a small Buddy paw-print sticker in one corner. Subtle, not attention-grabbing.


## Response

Delivered all 49 requested image assets, plus `store-v3-contact.jpg` for the PR overview. The surf and skate sheets reuse the snowboard vector Buddy puppet: same head and expression shapes, torso/build construction and pose rig, with sport-specific clothes, hat, footwear and boards. Application code is unchanged.

![Store v3 overview](public/assets/store-v3-contact.jpg)

![Surf registration](public/assets/preview-buddy-surf-contact.png)

![Skate registration](public/assets/preview-buddy-skate-contact.png)

### Files delivered

| File | Bytes | Dimensions | Format |
|---|---:|---|---|
| `preview-buddy-surf-man-slim.webp` | 151,422 | 3000 × 600 | webp |
| `preview-buddy-surf-man-regular.webp` | 158,330 | 3000 × 600 | webp |
| `preview-buddy-surf-man-broad.webp` | 150,296 | 3000 × 600 | webp |
| `preview-buddy-surf-woman-slim.webp` | 167,644 | 3000 × 600 | webp |
| `preview-buddy-surf-woman-regular.webp` | 173,788 | 3000 × 600 | webp |
| `preview-buddy-surf-woman-broad.webp` | 166,380 | 3000 × 600 | webp |
| `preview-buddy-surf-kid-slim.webp` | 178,606 | 3000 × 600 | webp |
| `preview-buddy-surf-kid-regular.webp` | 174,238 | 3000 × 600 | webp |
| `preview-buddy-surf-kid-broad.webp` | 176,074 | 3000 × 600 | webp |
| `preview-buddy-skate-man-slim.webp` | 131,434 | 2400 × 600 | webp |
| `preview-buddy-skate-man-regular.webp` | 133,276 | 2400 × 600 | webp |
| `preview-buddy-skate-man-broad.webp` | 134,012 | 2400 × 600 | webp |
| `preview-buddy-skate-woman-slim.webp` | 142,002 | 2400 × 600 | webp |
| `preview-buddy-skate-woman-regular.webp` | 144,392 | 2400 × 600 | webp |
| `preview-buddy-skate-woman-broad.webp` | 145,684 | 2400 × 600 | webp |
| `preview-buddy-skate-kid-slim.webp` | 143,552 | 2400 × 600 | webp |
| `preview-buddy-skate-kid-regular.webp` | 146,444 | 2400 × 600 | webp |
| `preview-buddy-skate-kid-broad.webp` | 147,842 | 2400 × 600 | webp |
| `preview-buddy-surf-contact.png` | 343,205 | 3000 × 1800 | png |
| `preview-buddy-skate-contact.png` | 288,410 | 2400 × 1800 | png |
| `sport-snow.svg` | 1,995 | 256 × 256 | svg |
| `sport-skate.svg` | 3,683 | 256 × 256 | svg |
| `sport-surf.svg` | 1,680 | 256 × 256 | svg |
| `type-all-mountain.svg` | 2,246 | 256 × 256 | svg |
| `type-freestyle.svg` | 1,986 | 256 × 256 | svg |
| `type-powder.svg` | 1,614 | 256 × 256 | svg |
| `type-splitboard.svg` | 1,973 | 256 × 256 | svg |
| `type-deck.svg` | 1,045 | 256 × 256 | svg |
| `type-complete.svg` | 3,569 | 256 × 256 | svg |
| `type-cruiser.svg` | 3,701 | 256 × 256 | svg |
| `type-longboard.svg` | 3,575 | 256 × 256 | svg |
| `type-shortboard.svg` | 1,548 | 256 × 256 | svg |
| `type-fish.svg` | 967 | 256 × 256 | svg |
| `type-midlength.svg` | 1,006 | 256 × 256 | svg |
| `type-longboard-surf.svg` | 1,018 | 256 × 256 | svg |
| `type-foamie.svg` | 3,934 | 256 × 256 | svg |
| `hero-snow.webp` | 86,070 | 1600 × 640 | webp |
| `hero-snow-mobile.webp` | 52,478 | 800 × 800 | webp |
| `hero-skate.webp` | 67,870 | 1600 × 640 | webp |
| `hero-skate-mobile.webp` | 46,864 | 800 × 800 | webp |
| `hero-surf.webp` | 85,918 | 1600 × 640 | webp |
| `hero-surf-mobile.webp` | 51,452 | 800 × 800 | webp |
| `mascot-skate.png` | 81,871 | 800 × 800 | png |
| `mascot-surf.png` | 77,706 | 800 × 800 | png |
| `empty-search.png` | 84,187 | 1000 × 700 | png |
| `empty-saved.png` | 58,354 | 1000 × 700 | png |
| `placeholder-snow.png` | 18,960 | 600 × 800 | png |
| `placeholder-skate.png` | 15,865 | 600 × 800 | png |
| `placeholder-surf.png` | 19,537 | 600 × 800 | png |
| `store-v3-contact.jpg` | 549,184 | 2072 × 1666 | jpg |
| `manifest.json` (updated) | 23,891 | — | json |

### Validation and integration notes

- 18 WebP sheets, 162 frames. Surf: 3000 × 600 / 10 frames, 340 px Buddy, x=110, tail/feet y=592. Skate: 2400 × 600 / 8 frames, 440 px Buddy, x=150, feet y=592. Exact top/bottom sticker bounds verified on all temporary Buddy masks.
- Surf board lengths use exactly 340 × [0.95, 1.03, 1.10, 1.17, 1.24, 1.31, 1.38, 1.47, 1.56, 1.65]; tails stay at y=592, centre x=222. Fish frames have swallow tails; later boards have round noses.
- Skate deck length is exactly 260 px (x=20–280), centre (150,400). Widths are exactly [105,112.5,116.25,120,123.75,127.5,135,150] px. The formula W × 15 takes precedence over the rounded 116/124 entries in the request table. Wheels are outside those deck-width bounds.
- Heads are identical across the three builds of each persona/frame. Source alpha and encoded WebP alpha match exactly. No alpha enters a cell’s 4 px margin.
- WebP quality 80, alpha quality 100; every sheet and hero is below its requested byte limit. All PNG dimensions, transparency/opacity and limits checked.
- SVGs are hand-authored paths/shapes with exact 256 × 256 viewBoxes, no raster/text/font/filter dependencies, and below 15 KB. Outer dark hairlines surround the white sticker rims.
- Desktop heroes keep the left 45% calm; mobile versions are separately recomposed with the top 40% calm. These areas were visually checked and have less than 1.5% dark pixels.
- Review sheets retain the prior one-third-scale layout, on opaque white. All 49 requested assets and the extra overview are listed in the manifest.
- Numeric scale/registration rules take precedence over approximate anatomical descriptions; the same chubby marmot proportions are retained. Raster subpixel coverage can extend a geometric edge to the adjacent pixel.
- No product photos were generated. The three placeholders are deliberately quiet #E7E8E4 silhouettes with small paw stickers.

### Project checks

- `npm run build`: passed.
- `npm run typecheck`: passed after the build completed generating Next.js types.
- `npm test`: passed, 57 tests across 4 files.
- Full overview and both nine-row registration contact sheets were visually inspected after export.
