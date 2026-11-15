import type { BoardCategory, Sport } from "@/lib/types";

/**
 * Canonical board identity across retailers: brand + model + season.
 * Titles vary per shop ("Burton Custom Snowboard 2026", "Custom 2026 Snowboard",
 * "Planche Snowboard Burton Custom"), so we strip noise aggressively for the key
 * but keep a readable display model.
 */

const BRAND_NOISE = /\b(snowboards?|snowboarding|skateboards?|surfboards?|boards?|co\.?|inc\.?|mfg)\b/gi;
const ALIASES: Record<string, string> = { "yes": "yes", "yes.": "yes", "lib tech": "lib tech", "libtech": "lib tech", "gnu": "gnu", "dc shoes": "dc" };

export function cleanBrand(brand: string): string {
  const b = brand.replace(BRAND_NOISE, "").replace(/\s+/g, " ").trim();
  return b || brand.trim();
}

export function brandKey(brand: string): string {
  const k = cleanBrand(brand).toLowerCase().replace(/[^a-z0-9. ]+/g, "").trim();
  return ALIASES[k] ?? k.replace(/\.$/, "");
}

const GENDER = [
  [/\b(women'?s?|womens|wmns|ladies|damen|femme|femmes|für frauen|fur frauen|w's)\b/gi, "womens"],
  [/\b(kids?|youth|junior|jr|boys?|girls?|enfant|kinder)\b/gi, "kids"],
] as const;

export const hasModelYear = (title: string) => /\b20\d{2}\b/.test(title);

/** Season string from a model year in the title: "2026" → "2025/26". Defaults to the current season. */
export function seasonFrom(title: string, now = new Date()): string {
  const m = title.match(/\b20(\d{2})(?:\s*\/\s*(?:20)?(\d{2}))?\b/);
  const end = m ? Number(m[2] ?? m[1]) : (now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()) % 100;
  return `20${String(end - 1).padStart(2, "0")}/${String(end).padStart(2, "0")}`;
}

/** Human-readable model name: title minus brand, product-type words and year. */
export function displayModel(title: string, brand: string): string {
  const b = cleanBrand(brand).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title
    .replace(/^planche(?: de)? snowboard\s+/i, "")
    .replace(new RegExp(`^(${b}|${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s+`, "i"), "")
    .replace(/\b(snowboard|planche|board)\b(?!\s*\w*\s*(reel))/gi, "")
    .replace(/\b20\d{2}(\s*\/\s*(20)?\d{2})?\b/g, "")
    .replace(/\s*[-–|]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function modelKey(model: string): string {
  let k = model.toLowerCase();
  const tags: string[] = [];
  for (const [re, tag] of GENDER) {
    if (re.test(k)) tags.push(tag);
    k = k.replace(re, " ");
  }
  k = k.replace(/[^a-z0-9]+/g, " ").replace(/\b(men'?s?|mens|herren|homme|unisex)\b/g, " ").replace(/\s+/g, " ").trim();
  return [k, ...tags].join(" ");
}

export const boardKey = (brand: string, model: string, season: string) => `${brandKey(brand)}|${modelKey(model)}|${season}`;

/**
 * Board key including the sport, so a snowboard and a surfboard sharing a model
 * name never merge. Snow keeps the original 3-part key (existing rows stay valid);
 * skate also keys on the category (a deck and a complete of the same graphic differ).
 */
export function sportBoardKey(sport: Sport, category: BoardCategory | null, brand: string, model: string, season: string): string {
  const base = boardKey(brand, model, season);
  if (sport === "snow") return base;
  return `${sport === "skate" && category ? `skate:${category}` : sport}|${base}`;
}

/** Size tokens that belong to one variant, not the model: 8.25", 8.5 x 32, 5'10", 32.5L. */
const SKATE_SIZE_TOKEN = /(?<![\w.])\d{1,2}(?:[.,]\d{1,3})?\s*(?:"|″|”|in\b)?(?:\s*[x×]\s*\d{1,2}(?:[.,]\d{1,3})?\s*(?:"|″|”|in\b)?)?(?![\w.])/gi;
const SURF_SIZE_TOKEN = /(?<![\d.])\d{1,2}\s*(?:'|′|’|ft\.?)\s*(?:\d{1,2}(?:[.,]\d{1,2})?\s*(?:"|″|”|''|in\b)?)?|\b\d{1,3}(?:[.,]\d{1,2})?\s*-?\s*(?:l|liters?|litres?)\b|\b\d{2,3}\s*(?:''|"|″)/gi;
const SKATE_NOUNS = /\s*\b(skateboard|skate|deck|complete|cruiser|surfskate|surf ?skate|longboard)s?\b\s*$/i;
const SURF_NOUNS = /\s*\b(surfboard|surfb\w*|surf|shortboard|longboard|board)s?\b\s*$/i;

/** Display model per sport: snow as displayModel; skate/surf also drop variant sizes and trailing product nouns. */
export function displayModelFor(sport: Sport, title: string, brand: string): string {
  if (sport === "snow") return displayModel(title, brand);
  // Full vendor name first ("Santa Cruz Skateboards …"), then the cleaned one.
  const full = new RegExp(`^${brand.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  let m = displayModel(title.replace(full, ""), brand);
  const isSkate = sport === "skate";
  m = m.replace(isSkate ? SKATE_SIZE_TOKEN : SURF_SIZE_TOKEN, (tok) => {
    if (!isSkate) return " ";
    const n = Number(tok.replace(",", ".").match(/[\d.]+/)?.[0]);
    return (n >= 5.5 && n <= 11) || (n >= 20 && n <= 60) || /[x×]/i.test(tok) ? " " : tok;
  });
  const nouns = isSkate ? SKATE_NOUNS : SURF_NOUNS;
  for (let i = 0; i < 3; i++) m = m.replace(/\s*[-–|,]\s*$/, "").replace(/\s+$/, "").replace(nouns, "");
  m = m.replace(/\s*[-–|]\s*$/g, "").replace(/\s+/g, " ").trim();
  return m || displayModel(title, brand);
}

/** Kids' boards: out of scope for adult sizing. */
export const KIDS = /\b(kids?|youth|junior|jr|boys?|girls?|enfants?|kinder|grom|chopper|riglet|mini)\b/i;

/** Things that match "snowboard" in a title but aren't boards (splitboards are boards: category "splitboard"). */
export const NOT_A_BOARD = /\b(skins?|bag|tasche|housse|leash|reel|stomp|pad|wax|bindings?|fixations?|boots?|chaussures?|helmet|jacket|pants|cover|lock|tool|kit|pack)\b/i;
