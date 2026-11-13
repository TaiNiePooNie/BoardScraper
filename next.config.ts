import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright is server/CLI-only; never bundle it.
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
