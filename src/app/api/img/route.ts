import { NextResponse, type NextRequest } from "next/server";
import { RETAILERS } from "@/lib/retailers";
import { cutoutWebp } from "@/lib/server/cutout";

/**
 * Product photo proxy: fetches a shop image, trims the white/transparent canvas
 * around the board, resizes and serves WebP with long CDN caching. Only known
 * shop image hosts are allowed (no open proxy).
 * `cut=1`: also removes a plain studio background (transparent WebP) so the board
 * can float on a coloured backdrop.
 */
export const runtime = "nodejs";

/** Image CDNs the shops use that aren't on the shop's own domain. */
const ALLOWED = new Set(["cdn.shopify.com", "glisshop-glisshop-fr-storage.omn.proximis.com"]);
/** "images.blue-tomato.com" → "blue-tomato.com"; "www.routeone.co.uk" → "routeone.co.uk". */
const site = (host: string) => {
  const p = host.toLowerCase().split(".");
  const two = p.slice(-2).join(".");
  return /^(co|com|net|org)\.[a-z]{2}$/.test(two) ? p.slice(-3).join(".") : two;
};
/** Every shop we list: their own domains (and subdomains) are allowed too. */
const SHOP_SITES = new Set(Object.values(RETAILERS).map((r) => site(new URL(r.homepage).hostname)));
const allowed = (host: string) => ALLOWED.has(host) || SHOP_SITES.has(site(host));
const SIZES = [220, 440, 800, 1200];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("src") ?? "";
  const want = Number(req.nextUrl.searchParams.get("h") ?? 800);
  const height = SIZES.find((s) => s >= want) ?? 1200;
  let url: URL;
  try {
    url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
  } catch {
    return NextResponse.json({ error: "bad src" }, { status: 400 });
  }
  if (url.protocol !== "https:" || !allowed(url.hostname)) return NextResponse.json({ error: "host not allowed" }, { status: 403 });

  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 BoardBuddy-image-proxy" }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });

  const sharp = (await import("sharp")).default;
  const cut = req.nextUrl.searchParams.get("cut") === "1";
  try {
    const input = Buffer.from(await res.arrayBuffer());
    const out = cut ? await cutoutWebp(sharp(input), height) : await sharp(input)
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 18 })
      .resize({ height, width: Math.round(height * 1.4), fit: "inside", withoutEnlargement: true })
      .webp({ quality: 76 })
      .toBuffer();
    return new NextResponse(new Uint8Array(out), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.redirect(url, 302); // unknown format: let the browser load the original
  }
}
