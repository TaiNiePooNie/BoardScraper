import type { Page } from "playwright";
import type { Ambassador } from "@/lib/types";
import { gotoSafe } from "../browser";

/**
 * Pro-rider ↔ board cross-reference.
 *
 * Sources (in order of trust):
 *  1. Brand team pages — rider profile usually lists "Board: <model>" → confirmed
 *  2. Rider pro-model naming (e.g. "<Model> by <Rider>") → confirmed
 *  3. Retailer copy mentioning "ridden by"/"pro model" → likely
 *
 * Results are cached per brand per season; matching to canonical models
 * uses normalized model names (see normalizeModel).
 */
export interface TeamPageConfig {
  brand: string;
  url: string;
  riderCardSelector: string;
  nameSelector: string;
  boardSelector: string;
}

export const normalizeModel = (s: string) =>
  s.toLowerCase().replace(/\b(20\d\d(\/\d\d)?|snowboard|wide|men'?s|women'?s)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function scrapeTeamPage(page: Page, cfg: TeamPageConfig): Promise<Map<string, Ambassador[]>> {
  await gotoSafe(page, cfg.url);
  const rows = await page.$$eval(
    cfg.riderCardSelector,
    (cards, sel) =>
      cards.map((c) => ({
        name: c.querySelector(sel.name)?.textContent?.trim() ?? "",
        boards: [...c.querySelectorAll(sel.board)].map((b) => b.textContent?.trim() ?? ""),
      })),
    { name: cfg.nameSelector, board: cfg.boardSelector },
  );

  const byModel = new Map<string, Ambassador[]>();
  for (const r of rows) {
    if (!r.name) continue;
    for (const b of r.boards) {
      const key = normalizeModel(b);
      const list = byModel.get(key) ?? [];
      list.push({ id: `${cfg.brand}:${r.name}`.toLowerCase().replace(/\s+/g, "-"), name: r.name, disciplines: [], sourceUrl: cfg.url, confidence: "confirmed" });
      byModel.set(key, list);
    }
  }
  return byModel;
}

/** Fallback: detect "ridden by X" / "X pro model" in product copy. */
export function ambassadorsFromCopy(text: string, knownRiders: string[]): Ambassador[] {
  return knownRiders
    .filter((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text))
    .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name, disciplines: [], confidence: "likely" as const }));
}
