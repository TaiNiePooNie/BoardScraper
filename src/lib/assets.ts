import type { DealTier } from "./types";

/**
 * Every UI graphic requested from the design agent (see /ui-art-requests.md).
 * Filenames must match the .md exactly; files live in /public/assets/.
 */
export const ASSETS = {
  logo: "/assets/logo-wordmark.png",
  logoMark: "/assets/logo-mark.png",
  heroBackground: "/assets/hero-background.jpg",
  emptyState: "/assets/empty-state-no-deals.png",
  tierIcon: {
    "extremely-good": "/assets/tier-extremely-good.png",
    "very-good": "/assets/tier-very-good.png",
    good: "/assets/tier-good.png",
    normal: "/assets/tier-normal.png",
    bad: "/assets/tier-bad.png",
  } satisfies Record<DealTier, string>,
  styleIcon: {
    park: "/assets/style-park.png",
    "all-mountain": "/assets/style-all-mountain.png",
    freeride: "/assets/style-freeride.png",
  },
  ogImage: "/assets/og-image.png",
  favicon: "/assets/favicon.png",
} as const;
