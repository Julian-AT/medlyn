import type { MetadataRoute } from "next";
import { siteDescription, siteName, themeColor } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      { src: "/images/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
