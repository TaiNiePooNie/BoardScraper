import type { MetadataRoute } from "next";
import { activeBoardIds } from "@/lib/data/board-summary";
import { appUrl } from "@/lib/email/send";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const ids = await activeBoardIds().catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...["snow", "skate", "surf"].map((s) => ({ url: `${base}/?sport=${s}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...ids.map((id) => ({ url: `${base}/board/${id}`, changeFrequency: "daily" as const, priority: 0.5 })),
  ];
}
