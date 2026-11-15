import type { Retailer, Sport } from "@/lib/types";
import type { RetailerAdapter } from "../types";
import { shopifyAdapter } from "./shopify";

export { fromShopifyJs, parseShopifyProduct } from "./shopify";

/**
 * evo.com runs on Shopify: crawled through the generic Shopify adapter, limited to
 * its board collections (handles verified on evo.com, Nov 2026). Skate is split by
 * type so each feed is a clean board list; surf "Packages" (board + leash / rack-pad
 * bundles) and used/blem boards are filtered out in parsing.
 */
export const EVO_COLLECTIONS: ReadonlyArray<{ sport: Sport; handle: string }> = [
  { sport: "snow", handle: "snowboards" },
  { sport: "skate", handle: "skateboard-decks" },
  { sport: "skate", handle: "skateboard-completes" },
  { sport: "skate", handle: "cruiser-skateboards" },
  { sport: "skate", handle: "longboard-skateboard-completes" },
  { sport: "surf", handle: "surfboards" },
];

export const evoAdapter = (retailer: Retailer): RetailerAdapter => shopifyAdapter({ retailer, collections: EVO_COLLECTIONS });
