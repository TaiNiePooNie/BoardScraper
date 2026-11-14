import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright is server/CLI-only; never bundle it.
  serverExternalPackages: ["playwright", "@electric-sql/pglite", "postgres", "sharp"],
};

export default nextConfig;
