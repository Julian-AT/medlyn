import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { siteName, siteTagline, themeColor } from "@/lib/seo";

export const alt = "Medlyn — The facts your task needs, with sources.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const styles = {
  canvas: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "68px 80px",
    background: themeColor,
    color: "#120c08",
    fontFamily: "sans-serif",
  },
  brand: { display: "flex", alignItems: "center", gap: 18, fontSize: 38 },
  heading: { fontSize: 76, letterSpacing: "-3px", lineHeight: 1.1, maxWidth: 960 },
  footer: { display: "flex", fontSize: 24, color: "#625e59" },
} satisfies Record<string, CSSProperties>;

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/images/apple-touch-icon.png"));
  const logoUrl = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div style={styles.canvas}>
      <div style={styles.brand}>
        {/* biome-ignore lint/performance/noImgElement: ImageResponse renders a PNG, not a web page. */}
        <img src={logoUrl} alt="Medlyn logo" width={64} height={64} />
        {siteName}
      </div>
      <div style={styles.heading}>{siteTagline}</div>
      <div style={styles.footer}>Clinical documentation · Demo prototype</div>
    </div>,
    size,
  );
}
