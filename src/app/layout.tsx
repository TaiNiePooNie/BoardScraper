import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ASSETS } from "@/lib/assets";

export const metadata: Metadata = {
  title: "BoardBuddy",
  description: "Your snowboard shop buddy: boards that fit your size, style and budget, with the best live deals.",
  icons: { icon: ASSETS.favicon, apple: ASSETS.appIcon },
  openGraph: { images: [ASSETS.ogImage] },
};

export const viewport: Viewport = { themeColor: "#15161a", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,800;1,700;1,800;1,900&family=Inter:wght@400;500;600;700&family=Permanent+Marker&display=swap" />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
