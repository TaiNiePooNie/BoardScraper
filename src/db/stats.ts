/** npm run db:stats — quick health check of the catalog and recent scrape runs. */
import { sql } from "drizzle-orm";
import { openDb } from "./client";

const h = await openDb();
const q = async (s: string) => {
  const r = (await h.db.execute(sql.raw(s))) as unknown as { rows?: unknown[] } | unknown[];
  return Array.isArray(r) ? r : r.rows ?? [];
};
console.log("Listings per retailer");
console.table(await q(`select retailer_id, count(*)::int listings, count(*) filter (where active)::int active,
  count(list_price)::int with_rrp, count(*) filter (where tier='extremely-good')::int xg, count(*) filter (where tier='very-good')::int vg,
  count(*) filter (where tier='good')::int g, count(*) filter (where tier='normal')::int n, count(*) filter (where tier='bad')::int b
  from listings group by 1 order by 1`));
console.log("Boards");
console.table(await q(`select count(*)::int boards, count(profile)::int profile, count(flex)::int flex, count(shape)::int shape,
  count(msrp_amount)::int msrp, (select count(*)::int from (select board_id from listings group by 1 having count(distinct retailer_id) > 1) x) multi_retailer from boards`));
console.log("Recent runs");
console.table(await q(`select retailer_id, status, products_seen seen, products_saved saved, started_at, round(extract(epoch from finished_at - started_at))::int secs, left(error, 80) error
  from scrape_runs order by id desc limit 10`));
await h.close();
