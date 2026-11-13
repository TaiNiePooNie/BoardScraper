import type { Metadata } from "next";
import "./globals.css";
import { ASSETS } from "@/lib/assets";

export const metadata: Metadata = {
  title: "BoardScraper — snowboard deals sized for you",
  description: "Find the best snowboard deals that actually fit your weight, boots and riding style.",
  icons: { icon: ASSETS.favicon },
  openGraph: { images: [ASSETS.ogImage] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
