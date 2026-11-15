import type { BoardCategory, DealTier, FitPreference, Sport } from "./types";

/**
 * BoardBuddy UI art in use (see /ui-art-requests.md). Files live in /public/assets/.
 * The static build inlines every path below as a data URI.
 * Art that hasn't been delivered yet 404s; every use has a fallback (AssetImg).
 */
const inlined = (globalThis as { __BB_ASSETS?: Record<string, string> }).__BB_ASSETS;
const a = (f: string) => inlined?.[f] ?? `/assets/${f}`;

export const ASSETS = {
  // Brand
  logo: a("logo-wordmark.svg"),
  logoFull: a("logo-full.svg"),
  favicon: a("favicon.png"),
  appIcon: a("app-icon-512.png"),
  ogImage: a("og-image.png"),
  // Buddy
  mascot: {
    wave: a("mascot-wave.png"),
    point: a("mascot-point.png"),
    thinking: a("mascot-thinking.png"),
    shrug: a("mascot-shrug.png"),
    ride: a("mascot-ride.png"),
  },
  mascotCard: a("mascot-card.png"),
  mascotSport: { snow: a("mascot-ride.png"), skate: a("mascot-skate.png"), surf: a("mascot-surf.png") } satisfies Record<Sport, string>,
  avatars: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => a(`avatar-${n}.png`)),
  // Shop
  hero: { snow: a("hero-snow.webp"), skate: a("hero-skate.webp"), surf: a("hero-surf.webp") } satisfies Record<Sport, string>,
  sport: { snow: a("sport-snow.svg"), skate: a("sport-skate.svg"), surf: a("sport-surf.svg") } satisfies Record<Sport, string>,
  type: {
    "all-mountain": a("type-all-mountain.svg"), freestyle: a("type-freestyle.svg"), powder: a("type-powder.svg"), splitboard: a("type-splitboard.svg"),
    deck: a("type-deck.svg"), complete: a("type-complete.svg"), cruiser: a("type-cruiser.svg"), longboard: a("type-longboard.svg"),
    shortboard: a("type-shortboard.svg"), fish: a("type-fish.svg"), midlength: a("type-midlength.svg"), "longboard-surf": a("type-longboard-surf.svg"), foamie: a("type-foamie.svg"),
  } satisfies Record<BoardCategory, string>,
  boardPlaceholder: a("board-placeholder.png"),
  placeholder: { snow: a("placeholder-snow.png"), skate: a("placeholder-skate.png"), surf: a("placeholder-surf.png") } satisfies Record<Sport, string>,
  emptyNoBoards: a("empty-no-boards.png"),
  emptySearch: a("empty-search.png"),
  emptySaved: a("empty-saved.png"),
  // Find my size
  pickSport: { snow: a("pick-sport-snow.png"), skate: a("pick-sport-skate.png"), surf: a("pick-sport-surf.png") } satisfies Record<Sport, string>,
  pickFit: { kids: a("pick-fit-kids.png"), mens: a("pick-fit-men.png"), womens: a("pick-fit-women.png"), any: a("pick-fit-all.png") } satisfies Record<FitPreference, string>,
  fit: {
    any: a("fit-all.svg"),
    mens: a("fit-men.svg"),
    womens: a("fit-women.svg"),
    kids: a("fit-kids.svg"),
  } satisfies Record<FitPreference, string>,
  rider: {
    man: { slim: a("rider-man-slim.svg"), regular: a("rider-man-regular.svg"), broad: a("rider-man-broad.svg") },
    woman: { slim: a("rider-woman-slim.svg"), regular: a("rider-woman-regular.svg"), broad: a("rider-woman-broad.svg") },
    kid: { slim: a("rider-kid-slim.svg"), regular: a("rider-kid-regular.svg"), broad: a("rider-kid-broad.svg") },
  },
  previewBoard: a("preview-board.svg"),
} as const;

/** Rank letter for each deal tier (deal emails). */
export const TIER_RANK: Record<DealTier, string> = { "extremely-good": "S", "very-good": "A", good: "B", normal: "C", bad: "D" };
