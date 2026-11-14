/**
 * Decide what goes in one user's deal-alert email (pure; tested without a DB).
 *
 *  - Weekly roundup: each included buddy's top picks in budget (new boards first).
 *  - New-match mode: only boards not emailed before, or emailed boards that got ≥5 % cheaper.
 *  - Price drops: held boards now ≥3 % below the price we last saw for them.
 */
import { TIER_RANK } from "@/lib/assets";
import { buildDeals } from "@/lib/deals";
import type { Catalog } from "@/lib/data/repository";
import { isFullPrice } from "@/lib/grading";
import { groupDeals, sortGroups, type BoardGroup } from "@/lib/offers";
import type { Buddy } from "@/lib/profile";
import { formatMoney } from "@/lib/pricing/currency";
import type { BuyerLocale } from "@/lib/types";
import type { DigestBoard, DigestSection } from "@/lib/email/templates";

export interface LoggedPrice {
  price: number;
  currency: string;
}

export interface DigestInput {
  catalog: Catalog;
  locale: BuyerLocale;
  buddies: Buddy[];
  holds: string[];
  mode: "weekly" | "new-match";
  priceDrops: boolean;
  /** boardId → last emailed/seen delivered price */
  log: Map<string, LoggedPrice>;
  appUrl: string;
}

export interface Digest {
  sections: DigestSection[];
  /** boards to record in the log (sent or baseline for holds) with their current price */
  record: Array<{ boardId: string; price: number; currency: string }>;
  count: number;
}

const PER_BUDDY = 5;
const NEW_DROP = 0.05;
const HOLD_DROP = 0.03;

function toCard(g: BoardGroup, appUrl: string, reason: string): DigestBoard {
  const b = g.best;
  const sizes = (b.matchingSizes.length ? b.matchingSizes.map((m) => m.size) : b.listing.sizes.filter((s) => s.inStock)).map((s) => s.label);
  const pct = Math.round(b.grade.discountPct * 100);
  return {
    boardUrl: `${appUrl}/?board=${encodeURIComponent(g.id)}`,
    image: g.board.images[0] ?? null,
    brand: g.board.brand,
    model: g.board.model,
    price: formatMoney(b.landed.total, b.landed.currency),
    msrp: null,
    discountPct: isFullPrice(b.grade) ? 0 : pct,
    rank: TIER_RANK[g.tier],
    shop: b.retailer.name,
    reason,
    sizes: sizes.slice(0, 4).join(", ") || "see shop",
  };
}

export function buildDigest(input: DigestInput): Digest {
  const { catalog, locale, buddies, holds, mode, priceDrops, log, appUrl } = input;
  const sections: DigestSection[] = [];
  const record: Digest["record"] = [];
  const used = new Set<string>();

  const isNewOrCheaper = (g: BoardGroup) => {
    const prev = log.get(g.id);
    return !prev || (prev.currency === g.best.landed.currency && g.best.landed.total <= prev.price * (1 - NEW_DROP));
  };

  for (const buddy of buddies) {
    const { deals } = buildDeals(catalog, locale, buddy.rider);
    const groups = groupDeals(deals, buddy.budget, buddy.rider.style)
      .filter((g) => (g.budget === "in" || g.budget === "none") && g.tier !== "bad" && g.tier !== "normal");
    let picks = sortGroups(groups, "value").filter((g) => !used.has(g.id));
    if (mode === "new-match") picks = picks.filter(isNewOrCheaper);
    else picks = [...picks.filter(isNewOrCheaper), ...picks.filter((g) => !isNewOrCheaper(g))];
    picks = picks.slice(0, PER_BUDDY);
    if (!picks.length) continue;
    picks.forEach((g) => used.add(g.id));
    const who = buddies.length > 1 || buddy.name !== "Me" ? `for ${buddy.name}` : "for you";
    sections.push({
      title: mode === "new-match" ? `New boards that fit ${who.replace("for ", "")}` : `Top picks ${who}`,
      boards: picks.map((g) => toCard(g, appUrl, log.has(g.id) ? "Price dropped" : g.value.reasons[0] ?? "Fits your setup")),
    });
    for (const g of picks) record.push({ boardId: g.id, price: g.best.landed.total, currency: g.best.landed.currency });
  }

  if (priceDrops && holds.length) {
    const { deals } = buildDeals(catalog, locale, null);
    const held = groupDeals(deals, { min: null, max: null }, null).filter((g) => holds.includes(g.id));
    const dropped: BoardGroup[] = [];
    for (const g of held) {
      const prev = log.get(g.id);
      if (!prev || prev.currency !== g.best.landed.currency) {
        record.push({ boardId: g.id, price: g.best.landed.total, currency: g.best.landed.currency }); // baseline, no email
      } else if (g.best.landed.total <= prev.price * (1 - HOLD_DROP) && !used.has(g.id)) {
        dropped.push(g);
        record.push({ boardId: g.id, price: g.best.landed.total, currency: g.best.landed.currency });
      }
    }
    if (dropped.length) {
      sections.unshift({
        title: "Price drops on your holds",
        boards: dropped.map((g) => {
          const prev = log.get(g.id)!;
          return toCard(g, appUrl, `Was ${formatMoney(prev.price, g.best.landed.currency)}`);
        }),
      });
    }
  }

  return { sections, record, count: sections.reduce((n, s) => n + s.boards.length, 0) };
}

/** Is this user's email due now? Weekly: their weekday, once per day. New-match: at most every 20 h. */
export function isDue(mode: "weekly" | "new-match", weekday: number, lastSentAt: Date | null, now = new Date()): boolean {
  if (mode === "weekly") {
    if (now.getUTCDay() !== weekday) return false;
    return !lastSentAt || lastSentAt.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
  }
  return !lastSentAt || now.getTime() - lastSentAt.getTime() > 20 * 3600_000;
}
