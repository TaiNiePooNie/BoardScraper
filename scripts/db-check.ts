/** Production diagnostics (GitHub Actions, DATABASE_URL secret): feedback tables + a real POST through the route, then cleanup. */
import { sql, eq } from "drizzle-orm";
import { serverDb } from "../src/db/server";
import { feedback } from "../src/db/schema";

const db = serverDb();
const t = await db.execute(sql`select table_name from information_schema.tables where table_schema='public' and table_name like 'feedback%'`);
console.log("tables:", JSON.stringify(t));
const m = await db.execute(sql`select count(*) from drizzle.__drizzle_migrations`).catch((e) => String(e));
console.log("migrations:", JSON.stringify(m));
const { POST } = await import("../src/app/api/feedback/route");
const res = await POST(new Request("http://x/api/feedback", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify({ kind: "bug", subject: "Diagnostic test", message: "Automated diagnostic message, please ignore.", email: "", context: { test: true } }) }));
const body = await res.text();
console.log("POST status", res.status, body.slice(0, 300));
try { const id = JSON.parse(body).id; if (id) await db.delete(feedback).where(eq(feedback.id, id)); } catch { /* */ }
process.exit(0);
