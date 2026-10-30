import type { Metadata, Viewport } from "next";

function siteOrigin(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Public site URLs must be HTTP(S) origins without credentials");
  }
  return new URL(url.origin);
}

export const siteName = "Medlyn";
export const siteUrl = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com");
export const appUrl = siteOrigin(process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com");
export const siteTitle = "Source-linked patient summaries · Medlyn";
export const siteDescription =
  "Medlyn is a clinical documentation AI prototype that gives clinicians task-focused patient summaries, with each fact linked to its source in the patient record.";
export const siteTagline = "The facts your task needs, with sources.";
export const themeColor = "#f9f8f5";
// Update when the public page's content changes, not on every deployment.
export const contentUpdatedAt = "2026-10-30";

export const siteMetadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: siteName,
  title: { default: siteTitle, template: "%s · Medlyn" },
  description: siteDescription,
  keywords: [
    "clinical documentation AI",
    "source-linked patient summary",
    "clinical record review",
    "task-focused patient summaries",
    "clinical documentation prototype",
  ],
  authors: [{ name: "Medlyn team" }],
  creator: "Medlyn team",
  publisher: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteTagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/twitter-image", alt: siteTagline }],
  },
  icons: {
    icon: [
      { url: "/images/favicon.svg", type: "image/svg+xml" },
      { url: "/images/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const siteViewport: Viewport = { themeColor };
