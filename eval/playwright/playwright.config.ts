import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { outputRoot } from "../data.ts";

// biome-ignore lint/style/noDefaultExport: The tool discovers its configuration through the default export.
export default defineConfig({
  testDir: ".",
  testMatch: "visibility.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(outputRoot, "playwright-artifacts"),
  reporter: [["json", { outputFile: path.join(outputRoot, "playwright.json") }]],
  use: {
    channel:
      process.env.PLAYWRIGHT_CHANNEL ??
      (existsSync("/Applications/Google Chrome.app") ? "chrome" : undefined),
    baseURL: process.env.MEDLYN_WEB_URL ?? "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
});
