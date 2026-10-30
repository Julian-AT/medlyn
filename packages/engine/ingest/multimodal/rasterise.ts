import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { RasterManifest } from "./types.ts";

const exec = promisify(execFile);
export const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

export async function rasterise(pdf: string) {
  const out = await mkdtemp("/private/tmp/medlyn-pages-");
  await exec(
    "uv",
    [
      "run",
      "--no-sync",
      "--project",
      path.join(REPO_ROOT, "ml"),
      "python",
      "-m",
      "multimodal.rasterise",
      "--pdf",
      path.resolve(pdf),
      "--out",
      out,
    ],
    {
      cwd: path.join(REPO_ROOT, "ml"),
      maxBuffer: 1024 * 1024,
      timeout: 120_000,
      env: {
        ...process.env,
        UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/private/tmp/medlyn-uv-cache",
      },
    },
  );
  const content = await readFile(path.join(out, "pages.json"), "utf8");
  const manifest = RasterManifest.parse(JSON.parse(content));
  return { ...manifest, directory: out };
}
