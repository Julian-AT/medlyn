import type { MetadataRoute } from "next";
import { contentUpdatedAt, siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl.href, lastModified: contentUpdatedAt, priority: 1 }];
}
