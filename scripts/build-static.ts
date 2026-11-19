/**
 * Builds a single self-contained HTML page (UI + catalog snapshot) for the
 * Claude artifact / any static host:
 *   DATABASE_URL=pglite:./data/pglite npx tsx scripts/build-static.ts [out.html]
 */
import { cleanPhotoWebp } from "../src/lib/server/cutout";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DbRepository } from "../src/lib/data/repository";
import { openDb } from "../src/db/client";

const out = path.resolve(process.argv[2] ?? "dist/boardscraper.html");
const tmp = path.resolve("dist/.static");
mkdirSync(tmp, { recursive: true });

// 1. Catalog snapshot (active listings, 1y history, all sports) straight from the DB.
const h = await openDb();
const catalog = await new DbRepository(async () => h.db).getCatalog();
await h.close();
// 1b. Product photos: the artifact sandbox blocks shop image servers, so embed one small
// photo per board (first image, resized to WebP). Skip with --no-photos.
if (!process.argv.includes("--no-photos")) {
  const sharp = (await import("sharp")).default;
  let ok = 0;
  const queue = [...catalog.boards];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let b = queue.shift(); b; b = queue.shift()) {
      const src = b.images[0];
      if (!src) continue;
      try {
        const res = await fetch(src.startsWith("//") ? `https:${src}` : src, { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "Mozilla/5.0 BoardBuddy-static-build" } });
        if (!res.ok) throw new Error(String(res.status));
        // Background turned white and trimmed, like /api/img.
        const img = await cleanPhotoWebp(sharp(Buffer.from(await res.arrayBuffer())), 560);
        b.images = [`data:image/webp;base64,${img.toString("base64")}`];
        ok++;
      } catch {
        b.images = []; // placeholder art in the UI
      }
    }
  }));
  console.log(`  photos: ${ok}/${catalog.boards.length} embedded`);
} else {
  for (const b of catalog.boards) b.images = [];
}
const json = JSON.stringify({ ...catalog, exportedAt: new Date().toISOString() }).replace(/</g, "\\u003c");

// 1c. UI art: inline every file referenced in src/lib/assets.ts as a data URI.
const MIME: Record<string, string> = { png: "image/png", svg: "image/svg+xml", webp: "image/webp", jpg: "image/jpeg" };
const SKIP = new Set(["og-image.png", "app-icon-512.png", "favicon.png"]);
const avatarNames = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `avatar-${n}.png`);
const assetNames = [...readFileSync("src/lib/assets.ts", "utf8").matchAll(/a\("([^"]+)"\)/g)]
  .map((m) => m[1])
  .concat(avatarNames)
  .concat(readdirSync("public/assets").filter((f) => /^(preview-buddy-.*\.webp|pick-.*\.png)$/.test(f))) // size-finder art (the 135 size stills are too big to embed; the test page uses the sprite sheets)
  .filter((f) => !SKIP.has(f) && existsSync(path.join("public/assets", f))); // art not delivered yet → UI fallback
const inlined = Object.fromEntries(assetNames.map((f) => [f, `data:${MIME[f.split(".").pop()!]};base64,${readFileSync(path.join("public/assets", f)).toString("base64")}`]));

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
const html = `<meta charset="utf-8">
<title>BoardBuddy</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500..900&family=Inter:wght@400;500;600;700;800&display=swap">
<style>
:root { color-scheme: light; }
body { background: #ffffff; color: #15161a; }
${css}
</style>
<div id="root"></div>
<script>window.__BB_ASSETS=${JSON.stringify(inlined)}</script>
<script type="application/json" id="catalog">${json}</script>
<script>${js}</script>
`;
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, html);
// The snapshot holds every sport (no sport filter): the page filters per sport in the browser.
const perSport = Object.entries(catalog.boards.reduce<Record<string, number>>((m, b) => ({ ...m, [b.sport]: (m[b.sport] ?? 0) + 1 }), {}))
  .map(([s, n]) => `${s} ${n}`).join(", ");
console.log(`✓ ${out} — ${(html.length / 1024).toFixed(0)} KB, ${catalog.listings.length} listings, ${catalog.boards.length} boards (${perSport || "none"})`);
