/**
 * Builds a single self-contained HTML page (UI + catalog snapshot) for the
 * Claude artifact / any static host:
 *   DATABASE_URL=pglite:./data/pglite npx tsx scripts/build-static.ts [out.html]
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DbRepository } from "../src/lib/data/repository";
import { openDb } from "../src/db/client";

const out = path.resolve(process.argv[2] ?? "dist/boardscraper.html");
const tmp = path.resolve("dist/.static");
mkdirSync(tmp, { recursive: true });

// 1. Catalog snapshot (active listings, 1y history) straight from the DB.
const h = await openDb();
const catalog = await new DbRepository(async () => h.db).getCatalog();
await h.close();
const json = JSON.stringify({ ...catalog, exportedAt: new Date().toISOString() }).replace(/</g, "\\u003c");

// 2. JS bundle (React + app), minified.
await build({
  entryPoints: ["src/static/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  outfile: path.join(tmp, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "@": path.resolve("src") },
  logLevel: "warning",
});

// 3. Tailwind CSS for the classes the app uses.
execFileSync("npx", ["@tailwindcss/cli", "-i", "src/app/globals.css", "-o", path.join(tmp, "app.css"), "--minify"], { stdio: "inherit" });

const js = readFileSync(path.join(tmp, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(tmp, "app.css"), "utf8");
const html = `<title>BoardScraper</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap">
<style>
:root { --page-bg: #f6f8fb; --page-fg: #0b1220; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --page-bg: #0b1220; --page-fg: #f1f5f9; color-scheme: dark; } }
:root[data-theme="dark"] { --page-bg: #0b1220; --page-fg: #f1f5f9; color-scheme: dark; }
body { background: var(--page-bg); color: var(--page-fg); }
${css}
</style>
<div id="root"></div>
<script type="application/json" id="catalog">${json}</script>
<script>${js}</script>
`;
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`✓ ${out} — ${(html.length / 1024).toFixed(0)} KB, ${catalog.listings.length} listings, ${catalog.boards.length} boards`);
