import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/email/send";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/reset-password"] }], sitemap: `${appUrl()}/sitemap.xml` };
}
