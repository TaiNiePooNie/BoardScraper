/**
 * The "board page" look: every screen is tinted by one hue. Shop screens use the sport's
 * hue, a board page uses the board's own main colour (from the photo colour job).
 * Colours themselves are derived from the hue in globals.css (`.hue`).
 */
import type { Sport } from "./types";

export const SPORT_HUE: Record<Sport, number> = { snow: 212, skate: 22, surf: 190 };
/** Saved and profile screens have their own tint. */
export const SCREEN_HUE = { saved: 350, profile: 262 } as const;

/** Hue per photo colour. Black, white and grey carry no hue: the sport's hue is used. */
const COLOR_HUE: Record<string, number> = { red: 4, orange: 24, yellow: 44, green: 145, blue: 216, purple: 268, pink: 330, brown: 28 };

export function boardHue(board: { sport: Sport; colors?: string[] }): number {
  for (const c of board.colors ?? []) if (c in COLOR_HUE) return COLOR_HUE[c];
  return SPORT_HUE[board.sport];
}

/** Inline style that sets the tint for a `.hue` scope. */
export const hueStyle = (h: number) => ({ "--h": String(h) }) as React.CSSProperties;

// Words that don't name the board: collab markers, construction, sizes, generic types, colours.
const NOT_A_NAME = /^(x|the|and|of|pro|hp|c\d|\d.*|[\d.'"]+|women'?s|womens|men'?s|mens|kids?|youth|boys?|girls?|jr|-|epoxy|pu|eps|future|futures|fcs|fcs2|team|fish|round|nose|log|quad|twin|thruster|board|deck|complete|snowboard|surfboard|skateboard|cruiser|longboard|surfskate|narrow|wide|camber|rocker|flat|pp|purepop|cv|soft|top|softtop|white|black|grey|gray|orange|blue|red|green|yellow|pink|purple)$/i;

/**
 * The one or two words of a model name shown huge on a board page and on the shop's
 * best-deal hero: "Odysea X Mayhem Round Nose Fish" → "MAYHEM", "Deep Fake" → "DEEP FAKE".
 */
export function heroWord(model: string): string {
  const collab = model.split(/\s+x\s+/i);
  const part = collab.length > 1 ? collab[collab.length - 1] : model;
  const words = part.replace(/[()]/g, " ").split(/[\s/]+/).filter((w) => w.length > 1 && !/^\p{L}\.$/u.test(w) && !NOT_A_NAME.test(w));
  const pick = words[0] && words[0].length <= 4 && words[1] ? `${words[0]} ${words[1]}` : words[0];
  return (pick ?? model.split(/\s+/)[0] ?? model).toUpperCase();
}
