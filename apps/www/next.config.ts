import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(import.meta.dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: { root },
  outputFileTracingRoot: root,
  outputFileTracingExcludes: {
    "/*": ["../../.env*", "../../data/**", "../../TRACK-1-*/**", "../../ml/**"],
  },
};

export default nextConfig;
