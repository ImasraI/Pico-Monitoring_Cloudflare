import type { MetadataRoute } from "next";
import { publicPaths } from "@/components/marketing/metadata";
import { config } from "@/components/marketing/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({ url: `${config.siteUrl}${path}` }));
}
