import type { Metadata } from "next";
import { headers } from "next/headers";
import { boardSummary } from "@/lib/data/board-summary";
import { resolveLocale } from "@/lib/geo";
import { formatMoney } from "@/lib/pricing/currency";
import type { CurrencyCode } from "@/lib/types";
import { ShopEntry } from "../../ShopEntry";

export const dynamic = "force-dynamic";

const SPORT_NOUN: Record<string, string> = { snow: "snowboard", skate: "skateboard", surf: "surfboard" };

/** Shareable board link: real title, description and photo for link previews and search engines. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const b = await boardSummary((await params).id).catch(() => null);
  if (!b) return { title: "BoardBuddy" };
  const price = b.fromPrice !== null && b.currency ? formatMoney(b.fromPrice, b.currency as CurrencyCode) : null;
  const title = `${b.brand} ${b.model}${price ? ` from ${price}` : ""} · BoardBuddy`;
  const description = `Compare prices for the ${b.brand} ${b.model} ${SPORT_NOUN[b.sport] ?? "board"} (${b.season})${b.shops ? ` at ${b.shops} shop${b.shops === 1 ? "" : "s"}` : ""}: delivered price, sizes in stock and price history.`;
  return {
    title, description,
    alternates: { canonical: `/board/${b.id}` },
    openGraph: { title, description, type: "website", ...(b.image ? { images: [{ url: b.image }] } : {}) },
    twitter: { card: b.image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = resolveLocale(await headers());
  return <ShopEntry initialLocale={locale} initialBoardId={(await params).id} />;
}
