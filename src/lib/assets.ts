import type { BoardCategory, DealTier, FitPreference, RidingStyle, SkillLevel, Sport } from "./types";
import type { StatKey } from "./stats";

/**
 * BoardBuddy UI art (see /ui-art-requests.md). Files live in /public/assets/.
 * The static build inlines every path below as a data URI.
 */
const inlined = (globalThis as { __BB_ASSETS?: Record<string, string> }).__BB_ASSETS;
const a = (f: string) => inlined?.[f] ?? `/assets/${f}`;

export const ASSETS = {
  logo: a("logo-wordmark.svg"),
  logoMark: a("logo-mark.svg"),
  favicon: a("favicon.png"),
  appIcon: a("app-icon-512.png"),
  ogImage: a("og-image.png"),
  mascot: {
    wave: a("mascot-wave.png"),
    point: a("mascot-point.png"),
    thinking: a("mascot-thinking.png"),
    celebrate: a("mascot-celebrate.png"),
    shrug: a("mascot-shrug.png"),
    ride: a("mascot-ride.png"),
  },
  wall: a("shop-wall-concrete.webp"),
  rackRail: a("rack-rail.png"),
  rackHook: a("rack-hook.png"),
  signNeon: a("sign-plate-neon.png"),
  signTape: a("sign-plate-tape.png"),
  heroShopfront: a("hero-shopfront.webp"),
  mountains: a("backdrop-mountains.png"),
  priceTag: a("price-tag.png"),
  saleSticker: a("sale-sticker.png"),
  stickerFullPrice: a("sticker-full-price.png"),
  stickerOverBudget: a("sticker-over-budget.png"),
  tape: a("tape-strip.png"),
  rank: {
    "extremely-good": a("rank-s.svg"),
    "very-good": a("rank-a.svg"),
    good: a("rank-b.svg"),
    normal: a("rank-c.svg"),
    bad: a("rank-d.svg"),
  } satisfies Record<DealTier, string>,
  style: {
    park: a("style-park.svg"),
    "all-mountain": a("style-all-mountain.svg"),
    freeride: a("style-freeride.svg"),
  } satisfies Record<RidingStyle, string>,
  skill: {
    beginner: a("skill-beginner.svg"),
    intermediate: a("skill-intermediate.svg"),
    advanced: a("skill-advanced.svg"),
    expert: a("skill-expert.svg"),
  } satisfies Record<SkillLevel, string>,
  stat: {
    speed: a("stat-speed.svg"),
    pop: a("stat-pop.svg"),
    float: a("stat-float.svg"),
    edgeHold: a("stat-edge-hold.svg"),
    forgiveness: a("stat-forgiveness.svg"),
  } satisfies Record<StatKey, string>,
  icon: {
    restock: a("icon-restock.svg"),
    watch: a("icon-watch.svg"),
    compare: a("icon-compare.svg"),
    share: a("icon-share.svg"),
    pro: a("icon-pro-mode.svg"),
  },
  boardPlaceholder: a("board-placeholder.png"),
  snowSpray: a("snow-spray-sprite.png"),
  halftone: a("halftone-overlay.png"),
  scribble: a("scribble-underline.svg"),
  doodleArrow: a("doodle-arrow.svg"),
  emptyNoBoards: a("empty-no-boards.png"),
  // v2 art (ui-art-requests.md "v2"); components fall back gracefully until delivered
  logoFull: a("logo-full.svg"),
  logoIcon: a("logo-icon.svg"),
  logoFullPng: a("logo-full.png"),
  fit: {
    any: a("fit-all.svg"),
    mens: a("fit-men.svg"),
    womens: a("fit-women.svg"),
    kids: a("fit-kids.svg"),
  } satisfies Record<FitPreference, string>,
  styleAny: a("style-any.svg"),
  rider: {
    man: { slim: a("rider-man-slim.svg"), regular: a("rider-man-regular.svg"), broad: a("rider-man-broad.svg") },
    woman: { slim: a("rider-woman-slim.svg"), regular: a("rider-woman-regular.svg"), broad: a("rider-woman-broad.svg") },
    kid: { slim: a("rider-kid-slim.svg"), regular: a("rider-kid-regular.svg"), broad: a("rider-kid-broad.svg") },
  },
  previewBoard: a("preview-board.svg"),
  avatars: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => a(`avatar-${n}.png`)),
  mascotCard: a("mascot-card.png"),
  emailHeader: a("email-header.png"),
  // v3 store art (CHATGPT_CALL_store-v3.md); every use has a fallback until delivered
  sport: { snow: a("sport-snow.svg"), skate: a("sport-skate.svg"), surf: a("sport-surf.svg") } satisfies Record<Sport, string>,
  type: {
    "all-mountain": a("type-all-mountain.svg"), freestyle: a("type-freestyle.svg"), powder: a("type-powder.svg"), splitboard: a("type-splitboard.svg"),
    deck: a("type-deck.svg"), complete: a("type-complete.svg"), cruiser: a("type-cruiser.svg"), longboard: a("type-longboard.svg"),
    shortboard: a("type-shortboard.svg"), fish: a("type-fish.svg"), midlength: a("type-midlength.svg"), "longboard-surf": a("type-longboard-surf.svg"), foamie: a("type-foamie.svg"),
  } satisfies Record<BoardCategory, string>,
  hero: { snow: a("hero-snow.webp"), skate: a("hero-skate.webp"), surf: a("hero-surf.webp") } satisfies Record<Sport, string>,
  heroMobile: { snow: a("hero-snow-mobile.webp"), skate: a("hero-skate-mobile.webp"), surf: a("hero-surf-mobile.webp") } satisfies Record<Sport, string>,
  mascotSport: { snow: a("mascot-ride.png"), skate: a("mascot-skate.png"), surf: a("mascot-surf.png") } satisfies Record<Sport, string>,
  // Size-finder stickers (CHATGPT_CALL_size-finder-stickers.md); fall back to sport-*/fit-* until delivered
  pickSport: { snow: a("pick-sport-snow.png"), skate: a("pick-sport-skate.png"), surf: a("pick-sport-surf.png") } satisfies Record<Sport, string>,
  pickFit: { kids: a("pick-fit-kids.png"), mens: a("pick-fit-men.png"), womens: a("pick-fit-women.png"), any: a("pick-fit-all.png") } satisfies Record<FitPreference, string>,
  emptySearch: a("empty-search.png"),
  emptySaved: a("empty-saved.png"),
  placeholder: { snow: a("placeholder-snow.png"), skate: a("placeholder-skate.png"), surf: a("placeholder-surf.png") } satisfies Record<Sport, string>,
} as const;

/** Rank letter shown next to each tier (game-style), keeping the five tier names. */
export const TIER_RANK: Record<DealTier, string> = { "extremely-good": "S", "very-good": "A", good: "B", normal: "C", bad: "D" };
