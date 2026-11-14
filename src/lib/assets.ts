import type { DealTier, RidingStyle, SkillLevel } from "./types";
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
} as const;

/** Rank letter shown next to each tier (game-style), keeping the five tier names. */
export const TIER_RANK: Record<DealTier, string> = { "extremely-good": "S", "very-good": "A", good: "B", normal: "C", bad: "D" };
