import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(import.meta.dirname, "../..");
const envPath = path.join(root, ".env");
if (process.env.NODE_ENV !== "production" && existsSync(envPath)) process.loadEnvFile(envPath);

const config: NextConfig = {
  distDir: process.env.MEDLYN_NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@medlyn/engine"],
  turbopack: { root },
  outputFileTracingRoot: root,
  outputFileTracingExcludes: {
    "/*": [
      "../../.env*",
      "../../data/**",
      "../../TRACK-1-*/**",
      "../../ml/**",
      "../../eval/**",
      "../../**/*.zip",
      "../../**/*.sql",
    ],
  },
  devIndicators: false,
  headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default config;
