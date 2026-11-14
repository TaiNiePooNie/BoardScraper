import { headers } from "next/headers";
import { resolveLocale } from "@/lib/geo";
import { ShopEntry } from "./ShopEntry";

export default async function Home() {
  // Country from the host's IP-geo header (Vercel / Cloudflare), else browser language.
  const locale = resolveLocale(await headers());
  return <ShopEntry initialLocale={locale} />;
}
