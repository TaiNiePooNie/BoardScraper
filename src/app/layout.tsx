import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

/** Absolute base for social-card image URLs, when the site URL is configured. */
function siteBase(): URL | undefined {
  try {
    const u = process.env.APP_URL ?? process.env.BETTER_AUTH_URL;
    return u ? new URL(u) : undefined;
  } catch {
    return undefined;
  }
}
const base = siteBase();

export const metadata: Metadata = {
  ...(base ? { metadataBase: base } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "BoardBuddy",
  keywords: ["snowboard deals", "skateboard deals", "surfboard deals", "board size calculator", "price comparison"],
  icons: { icon: "/assets/favicon.png", apple: "/assets/app-icon-512.png" },
  appleWebApp: { capable: true, title: "BoardBuddy", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "BoardBuddy", title: SITE_TITLE, description: SITE_DESCRIPTION, images: ["/assets/og-image.png"] },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: ["/assets/og-image.png"] },
};

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500..900&family=Inter:wght@400;500;600;700;800&display=swap" />
      </head>
      <body className="min-h-screen font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
