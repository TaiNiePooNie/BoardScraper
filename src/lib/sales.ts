import type { Sport } from "./types";

/**
 * Sale calendar: the recurring moments when board prices usually drop, per region and
 * sport. Typical discounts are conservative ranges from shop sale history across the
 * industry; once our own price history spans a full year they can be replaced with
 * measured drops per shop. Dates are computed per year (UTC days).
 */
export interface SaleEvent {
  id: string;
  name: string;
  start: Date;
  /** Inclusive last day. */
  end: Date;
  /** Buyer countries this sale applies to ("*" = everywhere). */
  regions: readonly string[] | "*";
  sports: readonly Sport[];
  /** Typical extra discount during the sale, 0..1. */
  typical: [number, number];
  /** One line on why prices drop. */
  why: string;
}

const ALL: readonly Sport[] = ["snow", "skate", "surf"];
const EU = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
const BOXING_DAY = ["GB", "IE", "AU", "NZ", "CA", "HK", "SG"];
const DAY = 86_400_000;

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));
const addDays = (x: Date, n: number) => new Date(x.getTime() + n * DAY);
/** n-th weekday (0 = Sunday) of a month; n = -1 for the last one. */
function nthWeekday(y: number, m: number, weekday: number, n: number): Date {
  if (n > 0) {
    const first = d(y, m, 1);
    return addDays(first, ((weekday - first.getUTCDay() + 7) % 7) + (n - 1) * 7);
  }
  const last = d(y, m + 1, 0);
  return addDays(last, -((last.getUTCDay() - weekday + 7) % 7));
}
/** Western Easter Sunday (anonymous Gregorian algorithm). */
export function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return d(y, month, day);
}

export function saleEvents(y: number): SaleEvent[] {
  const blackFriday = addDays(nthWeekday(y, 11, 4, 4), 1); // day after US Thanksgiving
  const ev = (id: string, name: string, start: Date, end: Date, regions: SaleEvent["regions"], sports: readonly Sport[], typical: [number, number], why: string): SaleEvent =>
    ({ id: `${id}-${y}`, name, start, end, regions, sports, typical, why });
  return [
    ev("winter-sales", "Winter sales", d(y, 1, 2), d(y, 1, 31), [...EU, "CH", "NO", "GB"], ALL, [0.2, 0.5], "European winter sales clear stock after the holidays."),
    ev("new-year", "New Year sales", d(y, 1, 1), d(y, 1, 15), ["US", "CA", "AU", "NZ", "JP", "HK", "SG"], ALL, [0.1, 0.3], "Shops clear holiday stock in early January."),
    ev("presidents-day", "Presidents' Day sale", addDays(nthWeekday(y, 2, 1, 3), -2), nthWeekday(y, 2, 1, 3), ["US"], ["snow"], [0.15, 0.3], "A classic mid-season snowboard sale weekend in the US."),
    ev("spring-snow", "End-of-season snow sale", d(y, 3, 15), d(y, 4, 30), "*", ["snow"], [0.3, 0.5], "Snowboards drop hard when the season winds down."),
    ev("easter", "Easter sale", addDays(easter(y), -3), addDays(easter(y), 1), "*", ALL, [0.1, 0.25], "Long Easter weekend promotions."),
    ev("memorial-day", "Memorial Day sale", addDays(nthWeekday(y, 5, 1, -1), -3), nthWeekday(y, 5, 1, -1), ["US"], ["surf", "skate"], [0.1, 0.25], "Start-of-summer sales in the US."),
    ev("summer-sales", "Summer sales", d(y, 6, 25), d(y, 7, 31), [...EU, "CH", "NO", "GB"], ALL, [0.2, 0.5], "European summer sales; last season's snowboards are cheapest now too."),
    ev("eofy", "End of financial year sale", d(y, 6, 1), d(y, 6, 30), ["AU", "NZ"], ALL, [0.15, 0.4], "Australian EOFY clearance."),
    ev("labor-day", "Labor Day sale", addDays(nthWeekday(y, 9, 1, 1), -3), nthWeekday(y, 9, 1, 1), ["US", "CA"], ALL, [0.1, 0.25], "End-of-summer weekend sales."),
    ev("new-season", "New-season clearance", d(y, 9, 1), d(y, 10, 31), "*", ["snow"], [0.2, 0.4], "New models arrive, so last season's boards get cheaper."),
    ev("singles-day", "Singles' Day (11.11)", d(y, 11, 11), d(y, 11, 11), ["CN", "HK", "SG", "MY", "TW", "KR", "JP"], ALL, [0.1, 0.3], "The biggest online sale day in Asia."),
    ev("black-friday", "Black Friday week", addDays(blackFriday, -7), addDays(blackFriday, 3), "*", ALL, [0.15, 0.4], "The biggest sale of the year, through Cyber Monday."),
    ev("boxing-day", "Boxing Day sales", d(y, 12, 26), d(y + 1, 1, 6), BOXING_DAY, ALL, [0.2, 0.5], "Post-Christmas clearance."),
  ];
}

const appliesTo = (e: SaleEvent, country: string, sport: Sport) => (e.regions === "*" || e.regions.includes(country)) && e.sports.includes(sport);
const dayOf = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());

/** Sales running now and coming up within `days`, soonest first. */
export function salesFor(now: Date, country: string, sport: Sport, days = 60): { active: SaleEvent[]; upcoming: (SaleEvent & { inDays: number })[] } {
  const today = dayOf(now);
  const all = [...saleEvents(now.getUTCFullYear() - 1), ...saleEvents(now.getUTCFullYear()), ...saleEvents(now.getUTCFullYear() + 1)].filter((e) => appliesTo(e, country, sport));
  const active = all.filter((e) => dayOf(e.start) <= today && today <= dayOf(e.end));
  const upcoming = all
    .map((e) => ({ ...e, inDays: Math.round((dayOf(e.start) - today) / DAY) }))
    .filter((e) => e.inDays > 0 && e.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays);
  return { active, upcoming };
}

export type Verdict = { kind: "buy" | "wait" | "fair"; title: string; text: string; event?: SaleEvent };

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Buy now or wait? From the current discount and the next sale for this buyer and sport. */
export function buyOrWait(opts: { now: Date; country: string; sport: Sport; discountPct: number; lowestIn90: boolean }): Verdict | null {
  const { active, upcoming } = salesFor(opts.now, opts.country, opts.sport, 45);
  const sale = active[0];
  if (sale) {
    return opts.discountPct >= sale.typical[0]
      ? { kind: "buy", title: `Good time to buy: ${sale.name} is on`, text: `This board is ${pct(opts.discountPct)} off, in line with what ${sale.name} usually brings.`, event: sale }
      : { kind: "fair", title: `${sale.name} is on`, text: `This board isn't reduced much yet (${pct(opts.discountPct)}). Shops often add more during the sale: save it and we'll email you if the price drops.`, event: sale };
  }
  const next = upcoming[0];
  if (next && opts.discountPct < next.typical[1]) {
    const when = next.inDays === 1 ? "tomorrow" : `in ${next.inDays} days`;
    return {
      kind: "wait",
      title: `Probably cheaper soon: ${next.name} starts ${when}`,
      text: `${next.why} Boards usually drop ${pct(next.typical[0])}–${pct(next.typical[1])}${opts.discountPct > 0.03 ? ` (this one is ${pct(opts.discountPct)} off now)` : ""}. Save it and we'll email you when the price drops.`,
      event: next,
    };
  }
  if (next) return { kind: "buy", title: "Already a great price", text: `${pct(opts.discountPct)} off is more than ${next.name} usually brings.`, event: next };
  if (opts.lowestIn90 || opts.discountPct >= 0.2) return { kind: "buy", title: "Good time to buy", text: "No big sale is coming soon and this is a strong price." };
  return null;
}
