# CHATGPT_CALL: size-finder-stickers

> **ChatGPT / Codex:** follow the handshake in `AGENTS.md`. Read the **Style Bible** in `ui-art-requests.md` and the light-theme additions in `CHATGPT_RESPONSE_store-v3.md`. When finished, rename this file to `CHATGPT_RESPONSE_size-finder-stickers.md`, append a `## Response` section (every file: name, bytes, dimensions; anything not done exactly), open a PR on branch `art/size-finder-stickers` and **merge it into `main` yourself** (no human review needed). Only touch `/public/assets/` and this file.

## Why

The owner says the "Find my size" sheet doesn't match our mascot art. The sport icons (`sport-*.svg`), the Kids/Men/Women/All icons (`fit-*.svg`) and the size pictures (`preview-buddy-*` sprite sheets, drawn as a flat vector puppet) look different from Buddy in `mascot-wave.png`, `mascot-ride.png`, `mascot-skate.png`, `mascot-surf.png`, `mascot-celebrate.png`.

**Everything in this request must look like those mascot stickers:** the same Buddy (alpine marmot, lime beanie with pink pom-pom, mirrored Ice goggles, baggy jacket), the same line weight, shading and colours, thick Sticker White die-cut border plus the 2 px Asphalt hairline from the light-theme rules. Use those PNGs as the visual reference for every image; do not use the vector puppet from the sprite sheets.

The size pictures are now shown as **individual still images**: the app swaps whole pictures, it never blends two together. So each picture can be a fully drawn, expressive sticker; poses don't need to be in-betweens of each other.

## Common rules for the size pictures

- **Canvas:** 600 × 800 px, transparent, WebP with alpha, quality ~85, **≤ 160 KB** each.
- **Ground:** Buddy's feet (and the board's tail when it stands on it) on **y = 770**. Nothing within 8 px of the edges.
- **Buddy** is the same height in every picture of a persona: **520 px** from soles to the top of the pom-pom (kid Buddy too; the app scales kids down). Buddy stands left of centre (centre x ≈ 230); the board is on his right.
- **Personas:** `man` (classic Buddy, Asphalt jacket), `woman` (long braid from the beanie, eyelashes, Hot Pink jacket with Acid/Ice patches; not sexualised), `kid` (bigger head, short legs, oversized goggles, mittens, Ice jacket).
- **Builds:** `slim`, `regular`, `broad`: only body width changes; face and outfit stay identical within a persona. Broad is friendly and positive, never a caricature.
- **Boards** are generic: no logos or text. Snowboards Acid with a Hot Pink stripe; skateboards Asphalt grip with lime edge, wheels visible; surfboards Acid deck with a Hot Pink stringer.
- **Stages 1–5** go from "way too small" to "way too big", with a funny expression and posture that matches the board:
  1. way too small: bursting out laughing, pointing at the tiny board
  2. a bit small: amused shrug, "cute?"
  3. just right: big proud grin, thumbs up, arm around the board, small sparkle
  4. a bit big: "whoa", eyebrows up, leaning on it
  5. way too big: straining, knees bent, tongue out, sweat drops, wobble lines

### Board size per stage (keep the proportions; the app picks the stage)

| Sport | Stage 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Snow: board standing on its tail next to Buddy, length as share of Buddy's height | 0.55 (knee/thigh) | 0.70 (hip) | 0.86 (chin) | 0.98 (top of head) | 1.12 (far above) |
| Surf: board standing on its tail, length as share of Buddy's height | 1.00 (shortboard, pointy) | 1.15 (fish, swallow tail) | 1.30 (mid-length) | 1.47 (funboard, round nose) | 1.62 (big longboard / foamie) |
| Skate: deck held horizontally in front of the belly with both paws, seen from above; deck length 300 px; deck **width** | 90 px (narrow, ruler-like) | 115 px | 135 px | 160 px | 195 px (table-wide cruiser) |

For surf, Buddy is barefoot in a wetsuit (man: Asphalt with Acid panels; woman: Hot Pink with Ice panels; kid: Ice with Acid panels) and wears the lime bucket hat with pink band and Ice sunglasses pushed up (as in `mascot-surf.png`). For skate, sneakers instead of boots.

## Assets

### Asset Required: size-{sport}-{persona}-{build}-{stage}.webp (135 files)
- **Purpose:** "Find my size" picture; the app shows the one matching the rider's sport, persona, build and board size.
- **Dimensions:** 600x800, transparent WebP (see common rules).
- **Style/Theme:** Mascot sticker style exactly like `mascot-*.png`, light-theme hairline.
- **Specific Instructions:** `sport` ∈ snow, skate, surf · `persona` ∈ man, woman, kid · `build` ∈ slim, regular, broad · `stage` ∈ 1…5. Example names: `size-snow-man-regular-3.webp`, `size-surf-kid-broad-5.webp`, `size-skate-woman-slim-1.webp`. Registration (ground line, Buddy height and x position) must be identical across all files of a sport so swapping pictures doesn't jump.

### Asset Required: size-contact.png
- **Purpose:** Review sheet for the PR (not used by the app).
- **Dimensions:** 3000x2400, white background.
- **Specific Instructions:** All 135 pictures as a grid (rows: sport × persona × build, columns: stage 1–5) at reduced size with labels.

### Asset Required: pick-sport-snow.png, pick-sport-skate.png, pick-sport-surf.png
- **Purpose:** Sport choice in the size sheet and the shop header on phones (shown 28–48 px).
- **Dimensions:** 256x256, transparent PNG, ≤ 40 KB.
- **Style/Theme:** Mascot sticker, simplified to read at 28 px.
- **Specific Instructions:** Buddy's head and shoulders with the sport's board: snowboard over the shoulder + beanie; skateboard tucked under the arm; surfboard under the arm + bucket hat. Same framing in all three.

### Asset Required: pick-fit-kids.png, pick-fit-men.png, pick-fit-women.png, pick-fit-all.png
- **Purpose:** "Who's it for" choice (Kids / Men / Women / All), shown 32–48 px.
- **Dimensions:** 256x256, transparent PNG, ≤ 40 KB.
- **Style/Theme:** Mascot sticker head-and-shoulders portraits.
- **Specific Instructions:** kids = kid Buddy; men = classic Buddy; women = woman Buddy (braid); all = the three together, overlapping slightly. Same framing and head size across the set.
