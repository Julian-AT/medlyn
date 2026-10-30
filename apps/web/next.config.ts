import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(import.meta.dirname, "../..");
const envPath = path.join(root, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);
process.env.MEDLYN_REPO_ROOT = root;

const config: NextConfig = {
  transpilePackages: ["@medlyn/engine"],
  turbopack: { root },
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
