import type { BoardCategory, Sport } from "@/lib/types";
import type { BoardSpecs } from "../types";

/**
 * Sport + board-type classification for scraped products, from whatever the shop
 * gives us: collection / product type, breadcrumbs, tags, title and copy.
 */

/** Board nouns a real board title ends with (Blue Tomato truncates long URL slugs: "Surfboa", "Skateb"). */
const BOARD_TAIL = /\b(deck|complete|skateb\w*|skate|cruiser|longboard|surfsk\w*|surfb\w*|surf|softboard|foamie|log|fish|shortboard|mid ?length|board|snowboard|splitboard)\s*$/i;

/** Skate / surf gear that is not a board (the snow equivalent is NOT_A_BOARD). */
const GEAR = new RegExp(
  "\\b(" +
    [
      "trucks?", "wheels?", "bearings?", "grip ?tape", "griptape", "bushings?", "hardware", "risers?", "bolts?", "skate ?tool",
      "helmets?", "knee ?pads?", "elbow ?pads?", "wrist ?guards?", "protect\\w*", "pads?", "gloves?",
      "wetsuits?", "neoprene", "booties", "hoods?", "lycra", "rash ?guard", "poncho", "boardshorts?", "shirts?", "tee", "hoodie", "cap", "beanie",
      "fins?", "fin ?set", "leash(?:es)?", "leg ?rope", "traction", "deck ?grip", "tail ?pad", "wax", "socks?", "board ?bags?", "bags?", "covers?",
      "racks?", "tie ?downs?", "straps?", "bodyboards?", "fingerboards?", "skimboards?", "sup", "paddles?", "repair", "kit",
    ].join("|") +
    ")\\b",
  "i",
);

/** Bundles ("Deck + Helmet"), used / blemished stock: not comparable deals. */
const BUNDLE_OR_USED = /\s\+\s|\bpackage\b|\s-\s*(used|blem)\s*$|\b(used|b[- ]grade)\b\s*$/i;

/**
 * True for skate/surf accessories (trucks, wheels, griptape, helmets, wetsuits,
 * fins, leashes, traction pads, bags…). A gear word inside a real board title
 * ("Twin Fin Surfboard", "Flying Wheels … Surfskate") is fine: board titles end
 * with a board noun, accessories end with the accessory.
 */
export function isSkateSurfGear(title: string): boolean {
  const t = title.replace(/[-–|]\s*$/, "").replace(/\s+\d{4}\s*$/, "").trim();
  if (BUNDLE_OR_USED.test(title)) return true;
  if (!GEAR.test(t)) return false;
  return !BOARD_TAIL.test(t);
}

/** Variant labels to skip (B-grade, used, placeholder options). */
export const SKIP_VARIANT = /\b(b[- ]?grade|blem\w*|used|do not use)\b/i;

/** Guess the sport from shop taxonomy + title. Null = not a board we handle. */
export function detectSport(hint: string): Sport | null {
  const t = hint.toLowerCase();
  if (/\b(splitboards?|snowboards?)\b/.test(t)) return "snow";
  if (/\bsurf ?skat\w*/.test(t)) return "skate";
  if (/\b(surf|surfb\w*|shortboards?|funboards?|softboards?|foamies?|mid ?lengths?)\b/.test(t)) return "surf";
  if (/\b(skate\w*|cruisers?|longboard (?:complete|skate)\w*|decks?|completes?)\b/.test(t)) return "skate";
  if (/\d\s*['′’]\s*\d/.test(t)) return "surf";
  return null;
}

export const NO_SPECS: BoardSpecs = { profile: null, shape: null, flex: null, styles: [] };

export function skateCategory(text: string): BoardCategory {
  const t = text.toLowerCase();
  if (/\blongboards?\b|drop[- ]?through|drop[- ]?down|pintail|dancer|downhill/.test(t)) return "longboard";
  if (/\bcruisers?\b|surf ?skate|\bmini ?cruiser|penny|\bfish\b/.test(t)) return "cruiser";
  if (/\bcompletes?\b/.test(t)) return "complete";
  return "deck";
}

const FT = 30.48;
export function surfCategory(text: string, lengthsCm: number[] = []): BoardCategory {
  const t = text.toLowerCase();
  if (/\bfoam(ie)?s?\b|soft ?(top|board)s?|softech|odysea|\bbeater\b/.test(t)) return "foamie";
  if (/\bfish\b|swallow ?tail|\bkeel\b/.test(t)) return "fish";
  if (/\b(longboards?|log|noserider|nose ?rider|single ?fin long)\b/.test(t)) return "longboard-surf";
  if (/mid ?-?length|\begg\b|funboards?|mini ?-?mal|\bmidi\b|\b(?:mini|micro) ?log\b/.test(t)) return "midlength";
  const longest = lengthsCm.length ? Math.max(...lengthsCm) : 0;
  const shortest = lengthsCm.length ? Math.min(...lengthsCm) : 0;
  if (shortest >= 9 * FT - 1) return "longboard-surf";
  if (shortest >= 7 * FT - 1) return "midlength";
  if (longest && longest <= 7 * FT) return "shortboard";
  return "shortboard";
}

/**
 * Snow: keywords in the title / shop taxonomy first (copy mentions powder and park
 * far too often to be decisive), then the shape and style tags extracted from copy.
 */
export function snowCategory(titleAndTaxonomy: string, specs: BoardSpecs): BoardCategory {
  const t = titleAndTaxonomy.toLowerCase();
  if (/split ?board|\bsplit\b/.test(t)) return "splitboard";
  if (/\bpowder\b|\bpow\b|swallow ?tail|\bfish\b|backcountry|freeride/.test(t)) return "powder";
  if (/\bpark\b|freestyle|\bjib/.test(t)) return "freestyle";
  if (specs.shape === "tapered") return "powder";
  const park = specs.styles.includes("park");
  const freeride = specs.styles.includes("freeride");
  if (park && !freeride) return "freestyle";
  if (freeride && !park) return "powder";
  return "all-mountain";
}

/**
 * Board category from everything known about the product. `taxonomy` is the
 * shop's own classification (Shopify product_type, breadcrumbs), checked first.
 */
export function classifyCategory(sport: Sport, taxonomy: string, title: string, text: string, specs: BoardSpecs, lengthsCm: number[] = []): BoardCategory {
  if (sport === "skate") {
    const fromTax = taxonomy && /longboard|cruiser|surf ?skate|complete|deck/i.test(taxonomy) ? skateCategory(taxonomy) : null;
    return fromTax ?? skateCategory(`${title} ${taxonomy}`);
  }
  if (sport === "surf") {
    // Title first (foam / fish / log are explicit), then taxonomy, then length.
    const byTitle = surfCategory(title, []);
    if (byTitle !== "shortboard") return byTitle;
    if (/funboard/i.test(taxonomy)) return "midlength";
    if (/longboard/i.test(taxonomy)) return "longboard-surf";
    if (/soft|foam/i.test(taxonomy)) return "foamie";
    return surfCategory(`${title} ${text.slice(0, 600)}`, lengthsCm);
  }
  return snowCategory(`${title} ${taxonomy}`, specs);
}
