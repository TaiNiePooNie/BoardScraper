import { isFullPrice } from "./grading";
import { sortGroups, type BoardGroup } from "./offers";

/**
 * Shop sections ("walls"). A board can hang on more than one wall, the way a
 * shop puts a sale board on the sale rack and in its brand section.
 */
export type WallTone = "acid" | "pink" | "ice" | "orange" | "paper";

export interface Wall {
  id: string;
  title: string;
  subtitle: string;
  tone: WallTone;
  groups: BoardGroup[];
}

const PICKS = 10;

export function buildWalls(groups: BoardGroup[], holds: string[] = []): Wall[] {
  const inBudget = groups.filter((g) => g.budget === "in" || g.budget === "none");
  const seasons = inBudget.map((g) => g.board.season).sort();
  const current = seasons.at(-1);
  const held = new Set(holds);

  const walls: Wall[] = [
    {
      id: "holds",
      title: "On hold",
      subtitle: "Boards you're keeping an eye on",
      tone: "pink",
      groups: sortGroups(groups.filter((g) => held.has(g.id)), "value"),
    },
    {
      id: "picks",
      title: "Picks for you",
      subtitle: "Best mix of fit, deal and reviews in your budget",
      tone: "acid",
      groups: sortGroups(inBudget, "value").slice(0, PICKS),
    },
    {
      id: "sale",
      title: "Sale rack",
      subtitle: "S and A rank deals: big drops and price lows",
      tone: "pink",
      groups: sortGroups(inBudget.filter((g) => g.tier === "extremely-good" || g.tier === "very-good"), "discount"),
    },
    {
      id: "last-season",
      title: "Last season corner",
      subtitle: "Older models, often 30–40% cheaper and nearly the same",
      tone: "ice",
      groups: current ? sortGroups(inBudget.filter((g) => g.board.season < current), "value") : [],
    },
    {
      id: "full-price",
      title: "Full price wall",
      subtitle: "Not on sale right now, but they fit you",
      tone: "paper",
      groups: sortGroups(inBudget.filter((g) => isFullPrice(g.best.grade)), "value"),
    },
    {
      id: "over",
      title: "Slightly over budget",
      subtitle: "Up to 10% above your max",
      tone: "orange",
      groups: sortGroups(groups.filter((g) => g.budget === "over"), "value"),
    },
    {
      id: "all",
      title: "The whole shop",
      subtitle: "Everything that fits you, cheapest first",
      tone: "paper",
      groups: sortGroups(inBudget, "price"),
    },
  ];
  return walls.filter((w) => w.groups.length > 0);
}
