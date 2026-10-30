import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

function repositoryRoot() {
  let directory = process.cwd();
  while (!existsSync(path.join(directory, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error("Research repository root unavailable");
    directory = parent;
  }
  return directory;
}
const repoRoot = repositoryRoot();

export async function reportFile(relative: string): Promise<unknown | null> {
  try {
    return JSON.parse(
      await readFile(
        /*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ repoRoot, relative),
        "utf8",
      ),
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    console.warn("research_report_unavailable", {
      file: relative,
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return null;
  }
}

export async function sampleRecords(): Promise<unknown[]> {
  try {
    const content = await readFile(
      path.join(repoRoot, "ml/data/sample/shards/part-0000.jsonl"),
      "utf8",
    );
    return content
      .split("\n")
      .filter(Boolean)
      .slice(0, 20)
      .map((line) => JSON.parse(line));
  } catch (error) {
    console.warn("research_samples_unavailable", error instanceof Error ? error.name : "Unknown");
    return [];
  }
}
