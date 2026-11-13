import type { BoardProfile, BoardShape, RidingStyle } from "@/lib/types";
import type { BoardSpecs } from "../types";

/**
 * Heuristic spec extraction from retailer copy (EN / FR / DE).
 * Order matters: specific patterns before generic ones.
 */
const PROFILE_RULES: Array<[BoardProfile, RegExp]> = [
  ["directional-camber", /directional camber|camber directionnel|directional rocker\/camber|direktional(?:es|er)? camber/i],
  ["hybrid-rocker", /hybrid rocker|rocker hybride|flying v|camber\s*[/-]\s*rocker\s*[/-]\s*camber|\bc2x?\b|\bw[- ]rocker|hybrid-rocker|btx|rocker zwischen den (?:füßen|bindungen)/i],
  ["hybrid-camber", /hybrid camber|cambre hybride|camrock|rocker\s*[/-]\s*camber\s*[/-]\s*rocker|hybrid-camber|hybrid-cambre|s-camber|camber zwischen den (?:füßen|bindungen)|purepop|camber\/rocker|camber with rocker/i],
  ["flat", /flat[- ]?top|flat camber|flat[- ]rocker|zero camber|flat profile|profil (?:plat|flat)|flat base profile/i],
  ["rocker", /reverse camber|full rocker|rocker profile|cambre invers[ée]|full-rocker|banana|rocker-profil/i],
  ["camber", /traditional camber|classic camber|full camber|positive camber|cambre (?:classique|traditionnel|positif)|vollvorspannung|\bcamber profile/i],
  ["camber", /\bcamber\b|\bcambre\b|vorspannung/i],
  ["rocker", /\brocker\b/i],
];

const SHAPE_RULES: Array<[BoardShape, RegExp]> = [
  ["tapered", /tapered|\bfish\b|swallow ?tail|swallowtail|\btaper\b/i],
  ["directional-twin", /directional twin|twin directionnel|direktional(?:es)? twin|directional-twin/i],
  ["true-twin", /true twin|twin[- ]tip|perfect twin|\btwin shape|\btwin\b/i],
  ["directional", /\bdirectional\b|directionnel|direktional/i],
];

const STYLE_RULES: Array<[RidingStyle, RegExp]> = [
  ["park", /\bpark\b|freestyle|\bjib|rails?\b|jumps|snowpark|butter/i],
  ["freeride", /freeride|powder|backcountry|big mountain|\bpow\b|poudreuse|tiefschnee|splitboard|steeps/i],
  ["all-mountain", /all[- ]mountain|all[- ]?round|polyvalent|allrounder|groomers|piste|resort/i],
];

/** Flex words → 1..10. Checked within a window around the word "flex". */
const FLEX_WORDS: Array<[number, RegExp]> = [
  [9, /very stiff|ultra stiff|tr[eè]s rigide|sehr hart/i],
  [7, /medium[- ]stiff|stiff[- ]medium|mid[- ]stiff|semi[- ]rigide|mittelhart/i],
  [4, /medium[- ]soft|soft[- ]medium|mid[- ]soft|mittelweich|plut[ôo]t souple/i],
  [8, /\bstiff\b|\brigide\b|\bhart\b/i],
  [3, /\bsoft\b|\bsouple\b|\bweich\b|playful/i],
  [5, /\bmedium\b|\bmid\b|\bmoyen(?:ne)?\b|\bmittel\b/i],
];

function parseFlex(text: string): number | null {
  const num = text.match(/flex\D{0,25}?(\d{1,2}(?:[.,]5)?)\s*(?:\/|out of|of|sur|von)\s*10/i) ?? text.match(/(\d{1,2})\s*\/\s*10\s*flex/i);
  if (num) {
    const n = Math.round(Number(num[1].replace(",", ".")));
    if (n >= 1 && n <= 10) return n;
  }
  for (const m of text.matchAll(/flex/gi)) {
    const window = text.slice(Math.max(0, m.index! - 40), m.index! + 40);
    for (const [n, re] of FLEX_WORDS) if (re.test(window)) return n;
  }
  return null;
}

export function extractSpecs(text: string): BoardSpecs {
  return {
    profile: PROFILE_RULES.find(([, re]) => re.test(text))?.[0] ?? null,
    shape: SHAPE_RULES.find(([, re]) => re.test(text))?.[0] ?? null,
    flex: parseFlex(text),
    styles: STYLE_RULES.filter(([, re]) => re.test(text)).map(([s]) => s),
  };
}
