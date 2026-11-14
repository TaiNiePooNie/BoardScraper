# CHATGPT_CALL: size-preview-buddy

> **ChatGPT / Codex:** follow the handshake in `AGENTS.md`. Read the **Style Bible** in `ui-art-requests.md` first. When finished, rename this file to `CHATGPT_RESPONSE_size-preview-buddy.md`, append a `## Response` section, open a PR and **merge it into `main` yourself** (no human review needed).

## What this is for

On the setup screen ("Who's riding?") the user moves **height** and **weight** sliders and picks **Kids / Men / Women / All**. Next to the sliders we show **Buddy, our mascot, holding a snowboard** that matches the user's recommended board. This replaces the current plain mannequin and board (`rider-*.svg`, `preview-board.svg`), which don't fit the sticker style.

The sliders act as **playback scrubbers**: every slider movement steps through animation frames, like a flipbook.

- **Board-to-rider ratio → frame (0–9).** Short board for the rider = Buddy laughing at a tiny board; long board = Buddy straining under a huge one.
- **Weight-to-height (build) → sheet.** slim / regular / broad. The app crossfades between builds, so Buddy visibly gets slimmer or fatter.
- **Kids / Men / Women → persona.** Kid Buddy, Buddy, and a woman version of Buddy.
- **Height → overall scale.** The app scales the whole figure; you don't draw that.

Because frames are swapped and crossfaded live, **registration consistency is everything**. Adjacent frames must read as one smooth motion, and the same frame index must have the same pose and position across all builds and personas.

## Frame grid (all sheets)

- **Sprite sheet:** 10 frames in one horizontal row. Each frame is **300 × 600 px**, so the sheet is **3000 × 600 px**. Transparent background, WebP with alpha, quality ~80, **≤ 600 KB per sheet**.
- **Ground line:** the bottom of Buddy's boots and the board's tail sit exactly on **y = 592** in every frame.
- **Buddy** stands centred on **x = 115**. Height from boot soles to the top of the beanie pom-pom is exactly **440 px** in every frame and persona. Kid Buddy is also 440 px tall; their child proportions come from a bigger head, shorter legs and a smaller body, and the app scales kids down.
- **The board** stands upright on its tail to Buddy's right, centred on **x ≈ 225**. It's a snowboard seen from the top sheet: rounded nose and tail, slight waist, Acid top sheet with a Hot Pink stripe, two binding-mount marks, white die-cut sticker border, Asphalt outline. No logos or text.
- **Board length in px = ratio × 440**, using the ratio of the frame below. Keep it exact: the app relies on it.
- **Nothing outside the frame:** keep every pixel, including motion lines and sweat drops, at least 4 px inside its 300 × 600 cell.
- Sticker treatment as in the Style Bible: white die-cut outline around Buddy and the board together, Asphalt outlines, flat fills. No drop shadow.

## The 10 frames (same for every persona and build)

| Frame | Ratio (board ÷ rider) | Board reaches | Buddy's pose and expression (keep it funny) |
|---|---|---|---|
| 0 | 0.50 | knee | Bursting out laughing, pointing down at the tiny board with one paw, other paw on belly. |
| 1 | 0.58 | upper thigh | Amused smirk, patting the nose of the board like a puppy. |
| 2 | 0.66 | hip | Shrug with both paws up, eyebrows raised: "cute?" |
| 3 | 0.73 | waist | Curious: leaning in, one eye squinted, inspecting the board. |
| 4 | 0.80 | chest | Nodding approval, paw resting on the board's nose. |
| 5 | 0.86 | chin | **Sweet spot:** big confident grin, thumbs up, other arm around the board. |
| 6 | 0.91 | nose | **Sweet spot:** proud, paw on hip, goggles glinting, tiny sparkle near the board. |
| 7 | 0.97 | top of head | "Whoa": eyebrows up, mouth open, leaning on the board with one elbow. |
| 8 | 1.05 | above beanie | Leaning back, both paws gripping the board, one sweat drop, nervous grin. |
| 9 | 1.15 | far above | Straining comically: knees bent, eyes squeezed shut, tongue out, two sweat drops, small wobble motion lines on the board. |

Animate in small steps: each frame should be a believable in-between of its neighbours (arm positions, head tilt and expression change gradually), so scrubbing reads as continuous motion. The board only grows; its tail never leaves the ground line.

## Personas and builds

- **Man:** Buddy exactly as in the mascot poses (lime beanie with pink pom-pom, mirrored goggles pushed up, baggy Asphalt jacket with pink/ice patches).
- **Woman:** a woman version of Buddy. Same species and art style, long braid coming out of the beanie, eyelashes, Hot Pink jacket with Acid/Ice patches. Not a sexualised design.
- **Kid:** young Buddy. Bigger head relative to the body, short legs, oversized goggles, mittens, Ice jacket.
- **Builds:**
  - *slim*: narrow torso and legs.
  - *regular*: as the mascot today.
  - *broad*: wider belly, torso and legs; friendly and positive, never a caricature.

  Head size and face stay identical across builds of a persona, and only width changes, so a crossfade between builds looks like Buddy smoothly getting slimmer or fatter.

## Assets

### Asset Required: preview-buddy-man-slim.webp
- **Purpose:** Setup screen size preview, Men, slim build (frames picked by board-to-rider ratio).
- **Dimensions:** 3000x600 sprite sheet (10 frames of 300x600), transparent.
- **Style/Theme:** Style Bible sticker style; frame grid and frame table above.
- **Specific Instructions:** Man persona, slim build, frames 0–9 exactly as in the table.

### Asset Required: preview-buddy-man-regular.webp
- **Purpose:** Size preview, Men, regular build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Man persona, regular build. Same poses and registration as preview-buddy-man-slim.webp.

### Asset Required: preview-buddy-man-broad.webp
- **Purpose:** Size preview, Men, broad build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Man persona, broad build. Same poses and registration.

### Asset Required: preview-buddy-woman-slim.webp
- **Purpose:** Size preview, Women, slim build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Woman persona, slim build. Same poses and registration as the man sheets.

### Asset Required: preview-buddy-woman-regular.webp
- **Purpose:** Size preview, Women, regular build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Woman persona, regular build.

### Asset Required: preview-buddy-woman-broad.webp
- **Purpose:** Size preview, Women, broad build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Woman persona, broad build.

### Asset Required: preview-buddy-kid-slim.webp
- **Purpose:** Size preview, Kids, slim build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Kid persona, slim build. Same poses and registration.

### Asset Required: preview-buddy-kid-regular.webp
- **Purpose:** Size preview, Kids, regular build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Kid persona, regular build.

### Asset Required: preview-buddy-kid-broad.webp
- **Purpose:** Size preview, Kids, broad build.
- **Dimensions:** 3000x600 sprite sheet, transparent.
- **Style/Theme:** As above.
- **Specific Instructions:** Kid persona, broad build.

### Asset Required: preview-buddy-contact.png
- **Purpose:** Review sheet for the PR and the Response section (not used by the app).
- **Dimensions:** 3000x1800, opaque Concrete background.
- **Style/Theme:** Plain grid.
- **Specific Instructions:** All 9 sheets stacked (rows: man slim/regular/broad, woman slim/regular/broad, kid slim/regular/broad) at 1/3 scale, with a thin guide line at the ground line and frame borders, so registration can be checked at a glance. Text labels are allowed on this sheet only.
