# BoardBuddy — UI Art Requests

> **ChatGPT / Codex: the v1 pack is delivered and merged. Read the Style Bible first, then execute the open sections at the end of this file in order: "v1.1 revisions" (skip its two logo-wordmark items: the v2 logo system replaces them), then "v2: logo system, riders, profiles and email".**
> This file replaces all earlier art requests. Snowboard *product* photos are scraped by the app — do **not** generate those.

---

## How to execute

1. **Read the Style Bible below first.** Every asset must look like it comes from the same sticker pack.
2. **Make `style-sheet.png` first** (first asset in the list). Use it as your visual reference for every other asset so colours, outlines, the mascot and the sticker treatment stay consistent.
3. **Generate every asset in the list** with the **exact filename, format and dimensions** given. Save all files flat in **`/public/assets/`** (no subfolders).
4. **Formats**
   - `.svg`: hand-authored vector. Clean paths, `viewBox` matching the stated size, no embedded raster images, no external fonts (convert any lettering to paths), colours as hex fills, ≤ 30 KB each.
   - `.png`: transparent background unless the asset says otherwise, sRGB, ≤ 300 KB each (≤ 600 KB for full-scene images).
   - `.webp`: opaque scenes/textures, quality ~80, ≤ 500 KB each.
5. **No text inside artwork** unless an asset explicitly asks for it (the logo, the rank letters). The app renders all UI text in code so it can be translated and changed.
6. **Originality (strict):** the style is *inspired by* sticker/decal/graffiti action-sports game UIs. Do **not** copy, trace or closely imitate any existing game's logos, characters, icons, screens or fonts (e.g. Riders Republic, SSX, Steep), any snowboard brand's logos or board graphics, or any real person.
7. **Also create `/public/assets/manifest.json`** listing every file: `{ "file", "width", "height", "format", "alt" }` (`alt` = one short plain-English description; empty string for purely decorative textures).
8. **Self-check before committing:** dimensions exact, transparency where required, file-size limits, filenames exactly as written (lowercase, hyphens).
9. **Git:** create branch `art/boardbuddy-v1`, commit only files inside `/public/assets/`, push, and open a pull request titled **"BoardBuddy UI art v1"** whose description contains a contact-sheet image (all assets on one image) and a checklist of every filename below. Do not modify any other file. Do not merge — the owner reviews and merges.

---

## Style Bible

**Brand:** BoardBuddy — a snowboard deal finder that feels like browsing an **urban streetwear snowboard shop** at night: concrete walls, neon signs, boards on slatwall racks, every surface covered in stickers.

**Look:** sticker-bomb collage. Die-cut vinyl stickers, decals, spray-paint tags, marker scribbles, tape strips, halftone dots, torn paper. Energetic and playful, never messy enough to hurt readability.

**Palette (use these hex values exactly):**

| Token | Hex | Use |
|---|---|---|
| Asphalt | `#15161A` | Outlines, dark base |
| Concrete | `#2A2C31` | Secondary dark, wall tones |
| Sticker White | `#FAFAF7` | Die-cut sticker borders, highlights |
| Acid | `#D4FF3A` | Signature accent (neon lime) |
| Hot Pink | `#FF3D8B` | Secondary accent |
| Ice | `#33D6FF` | Tertiary accent, snow/cold |
| Safety Orange | `#FF6A1A` | Warnings, "over budget" |
| Tier S / Extremely Good | `#10B981` | Rank badge only |
| Tier A / Very Good | `#22C55E` | Rank badge only |
| Tier B / Good | `#0EA5E9` | Rank badge only |
| Tier C / Normal | `#94A3B8` | Rank badge only |
| Tier D / Bad | `#F43F5E` | Rank badge only |

**Sticker treatment (all icons, badges, mascot poses, stickers):**
- Thick **Sticker White die-cut border** around the whole shape (≈ 8 % of the asset's width).
- **Bold Asphalt outline** inside the border (≈ 4 px at 512 px size; scale proportionally).
- **Flat fills**, max 3 colours + Asphalt + Sticker White per asset; optional halftone-dot shading in one accent colour.
- **No baked drop shadows** (the app adds shadows in CSS) unless the asset says otherwise.
- Upright (0° rotation) unless the asset says otherwise — the app tilts stickers itself.

**Lettering (logo only):** chunky, hand-cut / stencil-graffiti hybrid, slanted ~10° forward, slightly uneven baseline like letters cut from vinyl.

**Mascot — "Buddy":** an original **alpine marmot** snowboarder.
- Chubby, friendly marmot; warm brown fur with a lighter belly and muzzle; two oversized front teeth in a confident grin.
- **Acid-lime beanie** with a **hot-pink pom-pom**.
- **Mirrored goggles pushed up** on the beanie, Ice-cyan lens.
- **Baggy Asphalt streetwear jacket** with small Hot Pink and Ice patches (abstract shapes, no logos or words).
- Same proportions, colours and outfit in every pose. Always sticker-treated.

---

## Assets

### Asset Required: style-sheet.png
- **Purpose:** Internal reference sheet for consistency (not shown in the app). Generate this first and reuse it as the reference for every other asset.
- **Dimensions:** 2400x1600, opaque Concrete `#2A2C31` background.
- **Style/Theme:** Sticker-bomb style guide board, laid out like a designer's pin-up wall.
- **Specific Instructions:** Show: the palette as 12 round sticker swatches with their hex codes written beneath; the mascot "Buddy" turnaround (front, three-quarter, side, back) in sticker treatment; one sample icon sticker; one sample rank badge; a sample price tag; the logo wordmark. Text is allowed on this sheet only.

### Asset Required: logo-wordmark.svg
- **Purpose:** Main logo, top-left of every screen and on the setup screen. Rendered 32–64 px tall.
- **Dimensions:** viewBox 1200x300.
- **Style/Theme:** Sticker-treated wordmark, transparent background.
- **Specific Instructions:** The word **"BoardBuddy"** in the lettering style from the Style Bible: Sticker White letters with Asphalt outline, the "BB" initials (or the double "d") picking up Acid. A small Hot Pink spray-paint drip under one letter. The whole word sits on one die-cut white sticker border. Must stay legible at 32 px tall: no thin strokes.

### Asset Required: logo-wordmark.png
- **Purpose:** Raster fallback of the logo (social previews, email).
- **Dimensions:** 1200x300, transparent.
- **Style/Theme:** Identical to logo-wordmark.svg.
- **Specific Instructions:** Export of logo-wordmark.svg.

### Asset Required: logo-mark.svg
- **Purpose:** Square brand mark: app icon, loading screens, compact header on phones.
- **Dimensions:** viewBox 512x512.
- **Style/Theme:** Single sticker, transparent background.
- **Specific Instructions:** Buddy's head (beanie + pushed-up goggles + grin) on a round Acid sticker with die-cut white border. Recognisable at 32 px.

### Asset Required: favicon.png
- **Purpose:** Browser tab icon.
- **Dimensions:** 64x64, transparent.
- **Style/Theme:** Simplified logo-mark.
- **Specific Instructions:** Only Buddy's head silhouette with beanie and goggles, 2 colours + outline. Must read at 16x16.

### Asset Required: app-icon-512.png
- **Purpose:** Home-screen icon when the site is added to a phone.
- **Dimensions:** 512x512, opaque Asphalt background.
- **Style/Theme:** logo-mark centred on Asphalt with subtle concrete texture.
- **Specific Instructions:** Keep the sticker inside the central 80 % (safe zone for rounded icon masks).

### Asset Required: og-image.png
- **Purpose:** Preview image when a link to the site is shared.
- **Dimensions:** 1200x630, opaque.
- **Style/Theme:** Night shop wall collage.
- **Specific Instructions:** Concrete wall background covered in stickers; the BoardBuddy wordmark large on the left; Buddy holding a snowboard on the right; three blank snowboards on a slatwall rack behind. Keep everything inside a 1100x530 safe area. The only text allowed is the wordmark.

### Asset Required: mascot-wave.png
- **Purpose:** Greets the user on the first setup step ("Let's find your ride").
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker (see Style Bible).
- **Specific Instructions:** Buddy standing, waving with one paw, snowboard tucked under the other arm (board top sheet blank Acid with a pink stripe — no logos).

### Asset Required: mascot-point.png
- **Purpose:** Points at tips, tooltips and the "why this board" panel.
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker.
- **Specific Instructions:** Buddy pointing confidently to the right with one paw, slight lean, goggles glinting.

### Asset Required: mascot-thinking.png
- **Purpose:** Loading states ("Checking the racks…").
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker.
- **Specific Instructions:** Buddy with paw on chin, eyes looking up, three small Ice-coloured doodle dots above the head.

### Asset Required: mascot-celebrate.png
- **Purpose:** Shown when an Extremely Good deal is found or a board is added to the watchlist.
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker.
- **Specific Instructions:** Buddy jumping with both paws up, snowboard strapped on, small Acid and Hot Pink confetti stickers around.

### Asset Required: mascot-shrug.png
- **Purpose:** Empty results and errors.
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker.
- **Specific Instructions:** Buddy shrugging with both paws out, apologetic grin, one ear slightly drooped.

### Asset Required: mascot-ride.png
- **Purpose:** Hero image on the setup screen and the "Restock" (refresh) progress screen.
- **Dimensions:** 1000x800, transparent.
- **Style/Theme:** Mascot sticker, dynamic action.
- **Specific Instructions:** Buddy carving a heelside turn, Ice snow spray behind, motion lines. Board top sheet blank Acid with a pink stripe.

### Asset Required: shop-wall-concrete.webp
- **Purpose:** Seamless background of the shop walls behind the board racks.
- **Dimensions:** 1024x1024, opaque, **must tile seamlessly** on all four edges.
- **Style/Theme:** Dark concrete wall at night.
- **Specific Instructions:** Concrete `#2A2C31` with subtle pores, a few faint paint-roller marks and very faint, unreadable spray tags in Concrete+10 % lightness. Low contrast: text and stickers will sit on top. No readable words, no logos.

### Asset Required: rack-rail.png
- **Purpose:** Horizontal slatwall rail that runs across each wall section; boards hang from it.
- **Dimensions:** 1024x96, transparent, **tiles seamlessly left-right**.
- **Style/Theme:** Brushed dark metal rail with bolts.
- **Specific Instructions:** Asphalt-to-Concrete metal with a thin highlight edge; a bolt every 256 px so it repeats cleanly.

### Asset Required: rack-hook.png
- **Purpose:** Wall hook holding each board on the rail.
- **Dimensions:** 160x120, transparent.
- **Style/Theme:** Same metal as rack-rail.
- **Specific Instructions:** Front view of a two-prong board hook, mounted at the top edge so it overlaps the rail. Soft shadow allowed under the prongs.

### Asset Required: sign-plate-neon.png
- **Purpose:** Blank neon sign behind each shop section title ("YOUR WALL", "SALE RACK", "LAST SEASON CORNER"…); the app writes the title on top.
- **Dimensions:** 1000x260, transparent.
- **Style/Theme:** Neon tube outline on a dark backing plate.
- **Specific Instructions:** Rounded-rectangle Asphalt plate with an Acid neon tube outline and soft glow; two mounting screws; a small Hot Pink neon arrow in the right corner. **Leave the centre empty — no text.**

### Asset Required: sign-plate-tape.png
- **Purpose:** Lighter alternative header for small sections and the board detail panels.
- **Dimensions:** 800x160, transparent.
- **Style/Theme:** Strip of torn paper held by tape.
- **Specific Instructions:** Sticker White torn-paper strip with two pieces of Hot Pink tape at the ends; **empty centre, no text**.

### Asset Required: hero-shopfront.webp
- **Purpose:** Background of the rider setup screens.
- **Dimensions:** 2400x1350, opaque.
- **Style/Theme:** Night street view into a snowboard shop, illustrated (not photographic), sticker-collage style.
- **Specific Instructions:** Shop window glowing Ice and Acid; boards on racks visible inside; snow falling; concrete sidewalk with stickers on a lamppost. Keep the **left 45 %** dark and low-detail (the setup card sits there). No readable signs, no logos, no people except optionally a tiny Buddy silhouette inside.

### Asset Required: backdrop-mountains.png
- **Purpose:** Decorative cut-paper mountain range along the bottom of the setup screens and the board detail view.
- **Dimensions:** 2400x500, transparent above the ridge line.
- **Style/Theme:** Torn-paper collage mountains.
- **Specific Instructions:** Three overlapping torn-paper ridges in Concrete, Ice (50 % tint) and Sticker White (snow caps), with halftone shading. Ridge peaks in the outer thirds; flatter in the middle.

### Asset Required: price-tag.png
- **Purpose:** Hanging price tag on each board in the racks; the app prints price, crossed-out MSRP and shop name on it.
- **Dimensions:** 360x480, transparent.
- **Style/Theme:** Card-stock shop tag with string.
- **Specific Instructions:** Sticker White tag with a punched hole at the top and a short black string loop above it; slightly dog-eared corner; faint Asphalt halftone in one corner. **Blank — no text.** Leave the central 80 % clear for printed text.

### Asset Required: sale-sticker.png
- **Purpose:** Discount sticker slapped on the price tag; the app prints "-35%" on it.
- **Dimensions:** 300x300, transparent.
- **Style/Theme:** Starburst sticker.
- **Specific Instructions:** 16-point Acid starburst with Asphalt outline and die-cut white border. **Blank centre, no text.**

### Asset Required: sticker-full-price.png
- **Purpose:** Small marker on undiscounted boards; the app prints "FULL PRICE".
- **Dimensions:** 320x120, transparent.
- **Style/Theme:** Rectangular label sticker.
- **Specific Instructions:** Concrete label with Sticker White border and a subtle diagonal scuff. **Blank, no text.**

### Asset Required: sticker-over-budget.png
- **Purpose:** Marker on boards in the "slightly over budget" section; the app prints the amount.
- **Dimensions:** 320x120, transparent.
- **Style/Theme:** Hazard-tape label sticker.
- **Specific Instructions:** Safety Orange label with diagonal Asphalt hazard stripes at both ends. **Blank centre, no text.**

### Asset Required: tape-strip.png
- **Purpose:** Decorative tape used to "stick" panels and photos in the board detail view.
- **Dimensions:** 300x90, transparent.
- **Style/Theme:** Semi-opaque masking tape.
- **Specific Instructions:** Hot Pink tape at 85 % opacity with torn ends and a subtle paper texture.

### Asset Required: rank-s.svg
- **Purpose:** Rank badge for the **Extremely Good** deal tier (tabs, cards, detail view). Rendered 20–64 px.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Sticker badge; the five rank badges must be one consistent set.
- **Specific Instructions:** Shield-shaped badge in `#10B981` with a big bold letter **"S"** (converted to paths) in Sticker White with Asphalt outline, two small Acid sparkle stars. Die-cut white border.

### Asset Required: rank-a.svg
- **Purpose:** Rank badge for the **Very Good** tier.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as rank-s.svg.
- **Specific Instructions:** Same shield in `#22C55E` with letter **"A"**, one sparkle star.

### Asset Required: rank-b.svg
- **Purpose:** Rank badge for the **Good** tier.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as rank-s.svg.
- **Specific Instructions:** Same shield in `#0EA5E9` with letter **"B"**, no stars.

### Asset Required: rank-c.svg
- **Purpose:** Rank badge for the **Normal** tier.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as rank-s.svg.
- **Specific Instructions:** Same shield in `#94A3B8` with letter **"C"**, no stars.

### Asset Required: rank-d.svg
- **Purpose:** Rank badge for the **Bad** tier.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as rank-s.svg.
- **Specific Instructions:** Same shield in `#F43F5E` with letter **"D"** and a small crack across the shield's corner. Playful, not alarming.

### Asset Required: style-park.svg
- **Purpose:** Riding-style choice card "Park" on the setup screen and filter chips. Rendered 32–120 px.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Icon sticker; one consistent set with the other style icons.
- **Specific Instructions:** A snowboard sliding a rail at an angle with three motion lines; Acid board, Ice rail.

### Asset Required: style-all-mountain.svg
- **Purpose:** Riding-style choice "All-Mountain".
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as style-park.svg.
- **Specific Instructions:** A snowboard carving an S-turn trail down a single peak; Hot Pink board, Ice trail.

### Asset Required: style-freeride.svg
- **Purpose:** Riding-style choice "Freeride".
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as style-park.svg.
- **Specific Instructions:** A directional board dropping into deep powder with a big Ice spray plume; Safety Orange board.

### Asset Required: skill-beginner.svg
- **Purpose:** Skill-level picker (rotating slot) on the setup screen. Rendered 32–96 px.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Icon sticker; set of four with increasing energy.
- **Specific Instructions:** One green-circle trail marker sticker with a small snowboard resting on it, calm.

### Asset Required: skill-intermediate.svg
- **Purpose:** Skill level "Intermediate".
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as skill-beginner.svg.
- **Specific Instructions:** Blue-square trail marker sticker with a snowboard mid-turn and two motion lines.

### Asset Required: skill-advanced.svg
- **Purpose:** Skill level "Advanced".
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as skill-beginner.svg.
- **Specific Instructions:** Black-diamond trail marker sticker with a snowboard airborne, three motion lines.

### Asset Required: skill-expert.svg
- **Purpose:** Skill level "Expert".
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as skill-beginner.svg.
- **Specific Instructions:** Double-black-diamond trail marker sticker with a snowboard doing a spin (circular motion arc) and small Acid flame accents.

### Asset Required: stat-speed.svg
- **Purpose:** Label icon for the "Speed" bar in the board stats panel (game-style stat bars). Rendered 20–40 px.
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Small icon sticker; set of five, same weight.
- **Specific Instructions:** Lightning bolt with speed lines, Acid.

### Asset Required: stat-pop.svg
- **Purpose:** Label icon for the "Pop" stat (how springy the board is).
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as stat-speed.svg.
- **Specific Instructions:** A spring/coil launching upward with a small burst, Hot Pink.

### Asset Required: stat-float.svg
- **Purpose:** Label icon for the "Float" stat (powder performance).
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as stat-speed.svg.
- **Specific Instructions:** A puffy cloud with three snowflakes under it, Ice.

### Asset Required: stat-edge-hold.svg
- **Purpose:** Label icon for the "Edge Hold" stat (grip on hard snow).
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as stat-speed.svg.
- **Specific Instructions:** A board edge biting into an ice slab with a small scrape spark, Safety Orange.

### Asset Required: stat-forgiveness.svg
- **Purpose:** Label icon for the "Forgiveness" stat (how easy and catch-free the board is).
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as stat-speed.svg.
- **Specific Instructions:** A heart wearing a tiny bandage (plaster), `#22C55E`.

### Asset Required: icon-restock.svg
- **Purpose:** "Restock" button that refreshes the shop's prices on command.
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Action icon sticker; set with the other icon-*.svg files.
- **Specific Instructions:** Two curved arrows forming a circle around a small snowboard, Acid arrows.

### Asset Required: icon-watch.svg
- **Purpose:** "Hold this board" (watchlist) toggle on boards.
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as icon-restock.svg.
- **Specific Instructions:** A bold heart with a small price-tag hanging from it, Hot Pink.

### Asset Required: icon-compare.svg
- **Purpose:** "Compare boards" action.
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as icon-restock.svg.
- **Specific Instructions:** Two upright snowboards side by side with a small "vs" spark between them (spark only, no letters), Ice and Acid.

### Asset Required: icon-share.svg
- **Purpose:** Share a board or setup link.
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as icon-restock.svg.
- **Specific Instructions:** A paper-plane folded from a sticker, Ice.

### Asset Required: icon-pro-mode.svg
- **Purpose:** Toggle that expands the lean basic UI into the advanced "Pro mode" (filters, tiers, table).
- **Dimensions:** viewBox 128x128.
- **Style/Theme:** Same set as icon-restock.svg.
- **Specific Instructions:** A wax iron / tuning tool crossed with a small wrench, Safety Orange.

### Asset Required: board-placeholder.png
- **Purpose:** Shown in racks and the detail view when a board's product photo can't load. Must look intentional, like a blank demo board.
- **Dimensions:** 400x1200, transparent background.
- **Style/Theme:** Vertical snowboard top view, sticker collage.
- **Specific Instructions:** A blank snowboard (rounded tip and tail, slight waist) in Concrete with a white die-cut outline; a few small generic stickers on it (a star, a lightning bolt, Buddy's head) and a strip of Hot Pink tape across the middle. No brand marks, no text.

### Asset Required: snow-spray-sprite.png
- **Purpose:** Short burst animation when a board is picked off the rack.
- **Dimensions:** 1536x256 (6 frames of 256x256 in one row), transparent.
- **Style/Theme:** Illustrated snow spray, sticker outline style.
- **Specific Instructions:** Frames 1–6: a small puff growing into a big Ice and Sticker White spray, then dissipating into dots. Same anchor point (bottom-centre) in every frame.

### Asset Required: halftone-overlay.png
- **Purpose:** Subtle texture layered over panels and headers.
- **Dimensions:** 512x512, transparent, **tiles seamlessly**.
- **Style/Theme:** Halftone dot pattern.
- **Specific Instructions:** Asphalt dots at 12 % opacity, diagonal 45° grid, varying dot size like a print fade.

### Asset Required: scribble-underline.svg
- **Purpose:** Hand-drawn underline under section titles and key numbers.
- **Dimensions:** viewBox 600x60.
- **Style/Theme:** Marker scribble.
- **Specific Instructions:** One energetic double-stroke marker underline in Acid, rounded line caps, stretchable horizontally (no detail at the ends that distorts).

### Asset Required: doodle-arrow.svg
- **Purpose:** Hand-drawn callout arrow pointing from detail labels to parts of the board (nose, waist, tail) in the board detail view.
- **Dimensions:** viewBox 240x120.
- **Style/Theme:** Marker doodle.
- **Specific Instructions:** One curved marker arrow in Sticker White with an Asphalt outline, arrowhead on the right end.

### Asset Required: empty-no-boards.png
- **Purpose:** Empty state when no boards fit the rider's size and budget.
- **Dimensions:** 1000x700, transparent.
- **Style/Theme:** Small sticker scene.
- **Specific Instructions:** An empty slatwall rack with two empty hooks, Buddy (shrug pose) standing in front holding a magnifying glass. No text.

---

## v1.1 revisions

> **Codex: execute only this section.** Regenerate each asset below, overwriting the existing file in `/public/assets/` with the **same filename, format and dimensions**. Keep the Style Bible and all general rules from "How to execute" (originality, file-size limits, sticker treatment). Update `manifest.json` only if the alt text changes. Work on branch **`art/boardbuddy-v1.1`**, open a PR titled **"BoardBuddy UI art v1.1"** with a before/after image for each file, and do not merge.

### Asset Required: rank-s.svg
- **Purpose:** Rank badge for the **Extremely Good** tier. Rendered 20–64 px, so the letter must be unmistakable.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same shield, colours, border and sparkles as v1.
- **Specific Instructions:** **Fix: the v1 "S" reads as the number 5.** Redraw it as a clearly curved **S** with rounded top and bottom bowls (no flat top bar, no sharp corner at the top-left). Check it at 20 px: it must not resemble a 5 or a $.

### Asset Required: logo-wordmark.svg
- **Purpose:** Main logo, top-left of every screen. Rendered 32–64 px tall.
- **Dimensions:** viewBox 1200x300.
- **Style/Theme:** Sticker-treated wordmark from the Style Bible: chunky **hand-cut / stencil-graffiti** letters, slanted ~10°, slightly uneven baseline like letters cut from vinyl.
- **Specific Instructions:** **Fixes:** (1) remove the gap that makes it read "Boar dBuddy": even letter spacing, "BoardBuddy" reads as one word; (2) replace the plain italic typeface with custom hand-cut lettering (varied letter angles, chunky strokes, a few cut corners). Keep: Sticker White letters, Asphalt outline, Acid on the two "B"s, one Hot Pink spray drip, one die-cut white border around the whole word. Convert lettering to paths.

### Asset Required: logo-wordmark.png
- **Purpose:** Raster fallback of the logo.
- **Dimensions:** 1200x300, transparent.
- **Style/Theme:** Identical to the revised logo-wordmark.svg.
- **Specific Instructions:** Export of the revised logo-wordmark.svg.

### Asset Required: snow-spray-sprite.png
- **Purpose:** Burst animation when a board is picked off the rack; plays at 256x256 per frame.
- **Dimensions:** 1536x256 (6 frames of 256x256 in one row), transparent.
- **Style/Theme:** Illustrated snow spray with sticker outlines (Asphalt outline, Sticker White and Ice fills).
- **Specific Instructions:** **Fix: v1 is tiny faint dots and doesn't read as spray.** Draw a bold, chunky spray cloud: frame 1 a small puff (~25 % of the frame), frames 2–4 a fan-shaped plume growing to fill ~80 % of the frame width, with big outlined snow clumps, frames 5–6 breaking into large outlined dots that fade (lower opacity). Bottom-centre anchor stays fixed in every frame.

### Asset Required: shop-wall-concrete.webp
- **Purpose:** Seamless background behind the board racks; it fills most of the screen.
- **Dimensions:** 1024x1024, opaque, must tile seamlessly on all four edges.
- **Style/Theme:** Dark concrete wall at night, illustrated.
- **Specific Instructions:** **Fix: v1 is nearly flat.** Add visible but low-contrast texture: concrete pores and speckle, two faint form-tie holes (small circles), a subtle horizontal formwork seam, faint roller marks, and 3–4 faded, unreadable spray tags and a few old torn sticker remnants in muted Acid/Hot Pink/Ice at 15–20 % opacity. Overall it should still sit around `#2A2C31` so text stays readable. Target 80–250 KB.

### Asset Required: mascot-shrug.png
- **Purpose:** Empty results and errors.
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker, identical character to v1.
- **Specific Instructions:** **Fix:** remove the stray white mark at the right edge of v1. Everything else stays the same.

### Asset Required: favicon.png
- **Purpose:** Browser tab icon; must read at 16x16.
- **Dimensions:** 64x64, transparent.
- **Style/Theme:** Simplified logo-mark.
- **Specific Instructions:** **Fix: v1 reads as a lime blob.** Show Buddy's face recognisably: round brown marmot head, two white front teeth, lime beanie on top with pink pom, cyan goggle band across the beanie. Max 4 colours + Asphalt outline, no white sticker border (too small).

---

## v2: logo system, riders, profiles and email

> **Codex: execute this section after v1.1** (skip v1.1's `logo-wordmark.svg` / `logo-wordmark.png` items). Same Style Bible and "How to execute" rules. New files go flat into `/public/assets/`; files that already exist are overwritten with the same name. Add every new file to `manifest.json`. Branch **`art/boardbuddy-v2`**, PR titled **"BoardBuddy UI art v2"** with a contact sheet, and a short screen recording or frame strip showing the logo morph (full logo → icon). Do not merge.

### Logo system rules (read before the logo assets)
- One system, two forms: the **full logo** (icon + wordmark) and the **icon** alone. The icon inside the full logo is **exactly the same drawing, size and position** as the standalone icon, so the app can animate between them: the wordmark slides/fades out and the icon stays put.
- In `logo-full.svg` the icon occupies **exactly the box x 0–300, y 0–300** of the 1200x300 viewBox; the wordmark sits in x 330–1200. `logo-icon.svg` is that 0–300 box on its own (viewBox 0 0 300 300).
- Structure the SVGs for motion: wrap the icon in `<g id="bb-icon">` (inside it, `<g id="bb-icon-shape">` and `<g id="bb-icon-mark">`), the wordmark in `<g id="bb-word">`, and give **each letter its own `<path id="bb-l1">` … `<path id="bb-l10">`** in reading order so letters can be stagger-animated. Convert all lettering to paths. No masks or filters that break when groups move independently.
- Direction: chunky **hand-cut vinyl sticker** lettering ("BOARDBUDDY", all caps or mixed case — pick the stronger one), slanted ~10°, slightly uneven baseline, Sticker White letters with Asphalt outline, Acid on the two **B**s, one Hot Pink spray drip. The icon is a **die-cut sticker of a snowboard seen from above, tilted ~20°, with a bold "BB" monogram** cut into it in the same lettering, Acid board on Asphalt, white die-cut border. It must read at 24 px.
- Must not resemble any existing brand's logo.

### Asset Required: logo-full.svg
- **Purpose:** Main logo in the header (top of page) and on the setup and sign-in screens; animates into the icon when the header shrinks.
- **Dimensions:** viewBox 1200x300.
- **Style/Theme:** Logo system rules above; transparent background.
- **Specific Instructions:** Icon in box 0–300 (`#bb-icon`), wordmark (`#bb-word`, letters `#bb-l1`–`#bb-l10`) to the right, vertically centred on the icon. One die-cut white border around the wordmark only (the icon has its own). Legible at 32 px tall.

### Asset Required: logo-icon.svg
- **Purpose:** Compact logo (scrolled header, app icon source, loading spinner base).
- **Dimensions:** viewBox 300x300.
- **Style/Theme:** Identical to `#bb-icon` in logo-full.svg.
- **Specific Instructions:** Exactly the icon from logo-full.svg (same paths, same coordinates), keeping the `#bb-icon`, `#bb-icon-shape`, `#bb-icon-mark` groups.

### Asset Required: logo-full.png
- **Purpose:** Raster logo for emails and social previews.
- **Dimensions:** 1200x300, transparent.
- **Style/Theme:** Export of logo-full.svg.
- **Specific Instructions:** Pixel-exact export.

### Asset Required: favicon.png
- **Purpose:** Browser tab icon (replaces v1/v1.1 favicon).
- **Dimensions:** 64x64, transparent.
- **Style/Theme:** Simplified logo-icon.
- **Specific Instructions:** The icon's board shape + "BB" only, no thin details; reads at 16 px.

### Asset Required: app-icon-512.png
- **Purpose:** Home-screen icon (replaces v1).
- **Dimensions:** 512x512, opaque Asphalt background.
- **Style/Theme:** logo-icon centred on Asphalt with subtle concrete texture.
- **Specific Instructions:** Keep the icon inside the central 80 %.

### Rider figures (size preview) — rules
- Used in the setup screen next to a to-scale board. The app **scales each figure's height** to the rider's height and picks the **build** (slim / regular / broad) from their weight-to-height ratio, so draw three builds per rider type rather than stretching one.
- Front view, standing, feet together on the bottom edge of the viewBox, arms slightly away from the body, friendly neutral expression, original characters (no real people).
- Outfit: snowboard jacket and pants, beanie, goggles pushed up on the beanie, boots. Sticker treatment (white die-cut border, Asphalt outline, flat fills, Style Bible colours; jackets can use Hot Pink/Ice/Acid patches).
- Every figure fills the full height of its viewBox (top of beanie at y=0, boot soles at y=600) so the app can scale it exactly. Body width grows from slim → regular → broad; head size stays the same within a rider type.

### Asset Required: rider-man-slim.svg
- **Purpose:** Size preview figure: men, slim build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above.
- **Specific Instructions:** Adult man, slim build, Acid jacket with Asphalt pants.

### Asset Required: rider-man-regular.svg
- **Purpose:** Size preview figure: men, regular build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above.
- **Specific Instructions:** Same character as rider-man-slim, regular build.

### Asset Required: rider-man-broad.svg
- **Purpose:** Size preview figure: men, broad/heavier build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above.
- **Specific Instructions:** Same character, broad build (wider torso and legs, still friendly and positive; not a caricature).

### Asset Required: rider-woman-slim.svg
- **Purpose:** Size preview figure: women, slim build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above.
- **Specific Instructions:** Adult woman, slim build, Hot Pink jacket, long hair or braid under the beanie, Asphalt pants.

### Asset Required: rider-woman-regular.svg
- **Purpose:** Size preview figure: women, regular build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above.
- **Specific Instructions:** Same character as rider-woman-slim, regular build.

### Asset Required: rider-woman-broad.svg
- **Purpose:** Size preview figure: women, broad/heavier build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above.
- **Specific Instructions:** Same character, broad build, positive and respectful.

### Asset Required: rider-kid-slim.svg
- **Purpose:** Size preview figure: kids, slim build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** Rider figure rules above; child proportions (bigger head relative to body, shorter legs).
- **Specific Instructions:** Child around 8–12 years, Ice jacket, oversized goggles, mittens.

### Asset Required: rider-kid-regular.svg
- **Purpose:** Size preview figure: kids, regular build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** As rider-kid-slim.
- **Specific Instructions:** Same child, regular build.

### Asset Required: rider-kid-broad.svg
- **Purpose:** Size preview figure: kids, broad build.
- **Dimensions:** viewBox 220x600.
- **Style/Theme:** As rider-kid-slim.
- **Specific Instructions:** Same child, broad build.

### Asset Required: preview-board.svg
- **Purpose:** The board standing next to the rider in the size preview; scaled to the recommended length (height) and widened slightly for Wide boards.
- **Dimensions:** viewBox 80x600.
- **Style/Theme:** Sticker-treated snowboard, front (top sheet) view, standing on its tail.
- **Specific Instructions:** Rounded nose and tail, slight waist, top sheet in Acid with a Hot Pink stripe and two small binding-mount marks; fills the full viewBox height. No logos or text.

### Asset Required: fit-all.svg
- **Purpose:** "All" choice in "Who's it for?" (setup and buddy profiles). Rendered 40–80 px.
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Icon sticker; one set with fit-men/fit-women/fit-kids.
- **Specific Instructions:** Three small rider heads (man, woman, kid from the rider figures) grouped together on one round sticker.

### Asset Required: fit-men.svg
- **Purpose:** "Men" choice (men's and unisex boards).
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as fit-all.svg.
- **Specific Instructions:** Head-and-shoulders of the man rider (beanie, goggles up) on an Acid round sticker.

### Asset Required: fit-women.svg
- **Purpose:** "Women" choice (women's boards).
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as fit-all.svg.
- **Specific Instructions:** Head-and-shoulders of the woman rider on a Hot Pink round sticker.

### Asset Required: fit-kids.svg
- **Purpose:** "Kids" choice (kids' boards).
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as fit-all.svg.
- **Specific Instructions:** Head-and-shoulders of the kid rider with oversized goggles on an Ice round sticker.

### Asset Required: style-any.svg
- **Purpose:** "All styles" choice on the "How do you ride?" step (show boards for every style).
- **Dimensions:** viewBox 256x256.
- **Style/Theme:** Same set as style-park/all-mountain/freeride.
- **Specific Instructions:** The three style motifs (rail, S-turn peak, powder plume) as a small fanned collage on one sticker.

### Asset Required: avatar-1.png
- **Purpose:** Profile picture choices for the user and their "buddies" (other riders they shop for). Shown 32–96 px in a round crop.
- **Dimensions:** 256x256, transparent; artwork centred in a circle of diameter 240.
- **Style/Theme:** Sticker head portraits, one consistent set of 8 original alpine characters, each in snowboard gear.
- **Specific Instructions:** A fox with a lime beanie and goggles.

### Asset Required: avatar-2.png
- **Purpose:** Profile picture choice (see avatar-1.png).
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** An ibex (mountain goat) with curled horns poking through a pink beanie.

### Asset Required: avatar-3.png
- **Purpose:** Profile picture choice.
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** A snowy owl with ice-blue goggles.

### Asset Required: avatar-4.png
- **Purpose:** Profile picture choice.
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** A bear cub with an orange beanie and a face-mask scarf pulled down.

### Asset Required: avatar-5.png
- **Purpose:** Profile picture choice.
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** A mountain hare with long ears through a striped beanie.

### Asset Required: avatar-6.png
- **Purpose:** Profile picture choice.
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** A friendly yeti (original design: shaggy white fur, small horns, no resemblance to any existing franchise yeti) with mirrored goggles.

### Asset Required: avatar-7.png
- **Purpose:** Profile picture choice.
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** A penguin with a helmet covered in tiny stickers.

### Asset Required: avatar-8.png
- **Purpose:** Profile picture choice.
- **Dimensions:** 256x256, transparent.
- **Style/Theme:** Same set as avatar-1.png.
- **Specific Instructions:** Buddy the marmot (the mascot) head only, matching the mascot exactly.

### Asset Required: mascot-card.png
- **Purpose:** Sign-in / create-account screen ("Join the crew"), and the email opt-in step.
- **Dimensions:** 800x800, transparent.
- **Style/Theme:** Mascot sticker, same character as the v1 mascot poses.
- **Specific Instructions:** Buddy holding up a blank membership card (card face empty, no text) in one paw and giving a thumbs up with the other.

### Asset Required: email-header.png
- **Purpose:** Top banner of the deal-alert emails ("New boards that fit you"). Emails are dark-themed in the site's style.
- **Dimensions:** 1200x360, opaque Asphalt/Concrete background (emails can't rely on transparency).
- **Style/Theme:** Night shop wall collage like og-image.png.
- **Specific Instructions:** Concrete wall with sticker remnants; logo-full on the left (the only text); Buddy (wave pose) on the right; two blank boards on a rack between them. Keep the logo inside the left 55 % and everything inside a 1120x300 safe area. ≤ 250 KB (PNG or high-quality, so test that it stays crisp at 600 px wide).
