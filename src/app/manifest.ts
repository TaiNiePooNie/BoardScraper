import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

/** Web app manifest: lets phones add BoardBuddy to the home screen (light theme, opens on the shop). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BoardBuddy",
    short_name: "BoardBuddy",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["shopping", "sports"],
    icons: [
      { src: "/assets/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/favicon.png", sizes: "64x64", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Snowboards", url: "/?sport=snow" },
      { name: "Skateboards", url: "/?sport=skate" },
      { name: "Surfboards", url: "/?sport=surf" },
    ],
  };
}
