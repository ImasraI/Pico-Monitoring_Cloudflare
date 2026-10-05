import type { MetadataRoute } from "next";
import { config } from "@/components/marketing/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api", "/danto.html"] },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
