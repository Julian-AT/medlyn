import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cohortReport } from "../apps/app/app/api/research/cohort/cohort-report.ts";
import { evaluationReport } from "../apps/app/app/api/research/evaluation/evaluation-report.ts";
import { quantumReport } from "../apps/app/app/api/research/evaluation/quantum-report.ts";

const root = path.resolve(import.meta.dirname, "..");
const sources = [];

async function source(relative, committed = false) {
  let content;
  try {
    content = committed
      ? execFileSync("git", ["show", `HEAD:${relative}`], { cwd: root, encoding: "utf8" })
      : await readFile(path.join(root, relative), "utf8");
  } catch (error) {
    if (!committed && error.code === "ENOENT") return null;
    throw error;
  }
  sources.push({
    path: relative,
    committed,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
  return content;
}

async function json(relative, committed = false) {
  const content = await source(relative, committed);
  return content === null ? null : JSON.parse(content);
}

const [full, sample, samplesText, regression, synthetic, verifier, quantum, metricsText] =
  await Promise.all([
    json("ml/data/synth-v1/manifest.json"),
    json("ml/data/sample/manifest.json", true),
    source("ml/data/sample/shards/part-0000.jsonl", true),
    json("eval/output/regression.json"),
    json("eval/output/synthetic.json"),
    json("ml/verifier/results.json"),
    json("ml/quantum/results.json"),
    source("METRICS.md"),
  ]);

const metricRow = (name) => metricsText?.split("\n").find((line) => line.startsWith(`| ${name}`));
const fraction = (name) => {
  const match = metricRow(name)?.match(/\*\*[^*]*?(\d+)\/(\d+)/);
  return match ? { numerator: Number(match[1]), denominator: Number(match[2]) } : null;
};
const latency = metricRow("Slowest load")?.match(
  /\*\*([\d.]+) s cold; ([\d.]+) s confirmed cached/,
);
const output = {
  version: 1,
  sources: sources.sort((a, b) => a.path.localeCompare(b.path)),
  cohort: cohortReport(
    full ?? sample,
    (samplesText ?? "").split("\n").filter(Boolean).slice(0, 20).map(JSON.parse),
    full ? "full" : "sample",
  ),
  evaluation: evaluationReport(regression, synthetic, verifier),
  quantum: quantumReport(quantum),
  metrics: {
    review: "Agent-reviewed (Codex), not clinician-reviewed",
    source: "METRICS.md",
    coldAnswers: fraction("Correct answers"),
    unsupportedLines: fraction("Invented facts"),
    coldSeconds: latency ? Number(latency[1]) : null,
    cachedSeconds: latency ? Number(latency[2]) : null,
  },
};
const destination = "apps/app/data/research-snapshot.json";
await mkdir(path.dirname(path.join(root, destination)), { recursive: true });
await writeFile(path.join(root, destination), `${JSON.stringify(output, null, 2)}\n`);
execFileSync(process.execPath, ["scripts/check-data.mjs", "--files", destination], {
  cwd: root,
  stdio: "inherit",
});
console.log(
  `Research snapshot: ${output.cohort.samples.length} synthetic samples; ${sources.length} sources`,
);
