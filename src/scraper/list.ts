/** Prints the retailer ids to scrape as a JSON array (validates an optional filter). Used by the scheduled workflow matrix. */
import { ADAPTERS } from "./retailers";

const want = process.argv[2]?.trim();
const ids = want ? want.split(",").map((s) => s.trim()) : Object.keys(ADAPTERS);
const unknown = ids.filter((id) => !ADAPTERS[id]);
if (unknown.length) {
  console.error(`Unknown retailer(s): ${unknown.join(", ")}. Known: ${Object.keys(ADAPTERS).join(", ")}`);
  process.exit(1);
}
console.log(JSON.stringify(ids));
