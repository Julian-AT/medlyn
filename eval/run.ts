import { spawn } from "node:child_process";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluateResult, EvaluateTestSuite } from "promptfoo";
import { scoreFindings } from "./assertions/fixtures.ts";
import { answeringCardIds } from "./assertions/rubrics.ts";
import { type Audit, audit, hasUnsupportedScreenClaims } from "./audit.ts";
import { heldoutTests, regressionTests } from "./cases.ts";
import { evalRoot, loadRegression, outputRoot } from "./data.ts";
import MedlynProvider, { type Capture } from "./provider.ts";
import { parseSuite } from "./synthetic/suite.ts";

process.env.PROMPTFOO_DISABLE_TELEMETRY = "1";
process.env.PROMPTFOO_DISABLE_UPDATE = "1";
process.env.PROMPTFOO_CONFIG_DIR = path.join(outputRoot, ".promptfoo");
process.env.LOG_LEVEL = "error";

export type Row = {
  id: string;
  pass: boolean;
  suitePass: boolean;
  error?: string | null;
  reason: string;
  answeringCardIds: string[];
  namedScores: Record<string, number>;
  checks: { metric?: string; pass: boolean; reason: string; unmeasured?: boolean }[];
  capture?: Capture;
  tier?: number;
};
type SuiteResult = { mode: "mock" | "live"; rows: Row[] };
type Timing = {
  situationId: string;
  coldMs?: number;
  warmMs?: number;
  cached?: boolean;
  error?: string;
};

async function save(name: string, value: unknown): Promise<void> {
  await writeFile(path.join(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`);
}

function toRow(result: EvaluateResult): Row {
  const components = result.gradingResult?.componentResults ?? [];
  const answer = components.find((c) => c.assertion?.metric === "answer");
  const citation = components.find((c) => c.assertion?.metric === "citation");
  const metadata = result.testCase.metadata;
  return {
    id: String(metadata?.questionId ?? metadata?.id ?? result.testIdx),
    pass: answer ? answer.pass && citation?.pass === true : result.success,
    suitePass: result.success,
    error: result.error,
    reason: result.gradingResult?.reason ?? result.error ?? "No grading result",
    answeringCardIds: answeringCardIds(answer?.reason ?? result.gradingResult?.reason ?? ""),
    namedScores: result.namedScores,
    checks: components.map((c) => ({
      metric: c.assertion?.metric,
      pass: c.pass,
      reason: c.reason,
      ...(c.metadata?.unmeasured ? { unmeasured: true } : {}),
    })),
    capture: result.response?.metadata as Capture | undefined,
    ...(metadata?.tier ? { tier: Number(metadata.tier) } : {}),
  };
}

async function scoreSuite(
  suite: "regression" | "heldout",
  provider = new MedlynProvider(),
): Promise<SuiteResult> {
  const { evaluate } = await import("promptfoo");
  const config: EvaluateTestSuite = {
    description: `Medlyn ${suite}`,
    prompts: ["{{situationText}}"],
    providers: [provider],
    tests: suite === "regression" ? await regressionTests() : await heldoutTests(),
    sharing: false,
    writeLatestResults: false,
  };
  const evaluated = await evaluate(config, {
    cache: false,
    maxConcurrency: Number(process.env.EVAL_CONCURRENCY ?? 3),
    showProgressBar: false,
    silent: true,
  });
  const summary = await evaluated.toEvaluateSummary();
  const result = {
    mode: process.env.EVAL_MOCK === "1" ? ("mock" as const) : ("live" as const),
    rows: summary.results
      .map(toRow)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
  };
  await save(suite === "heldout" ? "heldout.json" : "regression.json", result);
  return result;
}

async function heldoutWorker(): Promise<{ exitCode: number | null }> {
  const log = await open(path.join(outputRoot, "heldout.log"), "w");
  try {
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          fileURLToPath(import.meta.url),
          "--heldout-worker",
        ],
        {
          cwd: evalRoot,
          env: process.env,
          stdio: ["ignore", log.fd, log.fd],
        },
      );
      child.on("error", reject);
      child.on("exit", resolve);
    });
    return { exitCode };
  } finally {
    await log.close();
  }
}

async function visibility(): Promise<{ status: "passed" | "failed" | "skipped"; reason?: string }> {
  const webUrl = process.env.MEDLYN_WEB_URL ?? "http://localhost:3000";
  try {
    const response = await fetch(webUrl, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) return { status: "skipped", reason: `Web server HTTP ${response.status}` };
  } catch (error) {
    return {
      status: "skipped",
      reason: `Web server unreachable: ${error instanceof Error ? error.name : String(error)}`,
    };
  }
  const log = await open(path.join(outputRoot, "playwright.log"), "w");
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          path.join(evalRoot, "node_modules/@playwright/test/cli.js"),
          "test",
          "--config",
          path.join(evalRoot, "playwright/playwright.config.ts"),
        ],
        {
          cwd: evalRoot,
          env: { ...process.env, MEDLYN_WEB_URL: webUrl },
          stdio: ["ignore", log.fd, log.fd],
        },
      );
      child.on("error", reject);
      child.on("exit", resolve);
    });
    return code === 0 ? { status: "passed" } : { status: "failed", reason: "See playwright.log" };
  } finally {
    await log.close();
  }
}

function renderSummary(
  regression: SuiteResult,
  audits: Record<string, Audit>,
  timings: Timing[],
  heldout: SuiteResult | undefined,
  browser: Awaited<ReturnType<typeof visibility>>,
): string {
  const measured = Object.values(audits).filter((a) => a.status === "measured");
  const checks = measured.flatMap((a) => (a.traceability ? [a.traceability] : []));
  const references = checks.reduce((sum, c) => sum + c.checked, 0);
  const located = checks.reduce((sum, c) => sum + (c.located ?? 0), 0);
  const failures = checks.reduce((sum, c) => sum + c.failures.length, 0);
  const traceability =
    measured.length === Object.keys(audits).length && references > 0
      ? `${((located / references) * 100).toFixed(1)}% (${references} fact references; ${failures} violations)`
      : "Unmeasured / incomplete";
  const unsupported =
    measured.length === Object.keys(audits).length && measured.length
      ? String(measured.reduce((sum, a) => sum + (a.composed?.failures.length ?? 0), 0))
      : "Unmeasured / incomplete";
  const captures = regression.rows.flatMap((r) => (r.capture?.screen ? [r.capture] : []));
  const findings = scoreFindings(captures.flatMap((c) => c.screen.findings));
  const slowest = Math.max(
    0,
    ...timings.flatMap((t) => (t.coldMs === undefined ? [] : [t.coldMs])),
  );
  return [
    "# Automated evaluation (requires human review)",
    "",
    `Mode: ${regression.mode}. Mock results are harness checks, not patient metrics. Review layer: empty.`,
    "",
    `Regression: ${regression.rows.filter((r) => r.pass).length}/15`,
    "",
    "| Question | Result | Answering cards |",
    "| --- | --- | --- |",
    ...regression.rows.map(
      (r) => `| ${r.id} | ${r.pass ? "PASS" : "FAIL"} | ${r.answeringCardIds.join(", ") || "—"} |`,
    ),
    "",
    `Traceability: ${traceability}`,
    `Unsupported composed claims: ${unsupported}`,
    `Contradictions on regression screens: ${regression.mode === "mock" ? "unmeasured" : `${findings.contradictions}/5; false alarms ${findings.falseAlarmIds.length}; net ${findings.net}`}`,
    `Needs clarification: ${regression.mode === "mock" ? "unmeasured" : `${findings.matched.filter((m) => m.category === "needs_clarification" && m.found).length}/3`}`,
    `Slowest cold engine/API load: ${slowest ? `${slowest.toFixed(0)} ms` : "unmeasured"}`,
    `Browser visibility: ${browser.status}${browser.reason ? ` (${browser.reason})` : ""}`,
    "",
    "| Situation | Cold ms | Warm ms | Cache confirmed |",
    "| --- | ---: | ---: | --- |",
    ...timings.map(
      (t) =>
        `| ${t.situationId} | ${t.coldMs?.toFixed(0) ?? "—"} | ${t.warmMs?.toFixed(0) ?? "—"} | ${t.cached ? "yes" : "no"} |`,
    ),
    "",
    "Held-out scores are private until the orchestrator's H+7 review. Do not use them to tune prompts.",
    "",
    "| Tier | Scored | Relevance passes | Grounding passes |",
    "| --- | ---: | ---: | ---: |",
    ...[1, 2, 3].map((tier) => {
      const rows = heldout?.rows.filter((r) => r.tier === tier) ?? [];
      return `| ${tier} | ${rows.length} | ${rows.filter((r) => r.namedScores.relevance === 1).length} | ${regression.mode === "mock" ? "unmeasured" : rows.filter((r) => r.namedScores.grounding === 1).length} |`;
    }),
    "",
    "No figures in this file are human-checked. METRICS.md must be prepared separately.",
    "",
  ].join("\n");
}

async function run(): Promise<void> {
  await mkdir(outputRoot, { recursive: true });
  if (process.argv.includes("--heldout-worker")) {
    await scoreSuite("heldout");
    return;
  }
  const provider = new MedlynProvider();
  const regression = await scoreSuite("regression", provider);
  const audits: Record<string, Audit> = {};
  const timings: Timing[] = [];
  for (const situation of await loadRegression()) {
    const row = regression.rows.find(
      (r) => r.id.startsWith(`${situation.id}.`) && r.capture?.screen,
    );
    if (!row?.capture) {
      timings.push({ situationId: situation.id, error: "No cold screen" });
      continue;
    }
    audits[situation.id] = await audit(row.capture);
    try {
      const warm = await provider.capture(situation.text, "warm");
      timings.push({
        situationId: situation.id,
        coldMs: row.capture.wallMs,
        warmMs: warm.wallMs,
        cached: !warm.mock && warm.screen.timings.cached,
      });
    } catch (error) {
      timings.push({
        situationId: situation.id,
        coldMs: row.capture.wallMs,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const worker = await heldoutWorker();
  const heldout: SuiteResult | undefined =
    worker.exitCode === 0
      ? JSON.parse(await readFile(path.join(outputRoot, "heldout.json"), "utf8"))
      : undefined;
  const browser = await visibility();
  const findings = scoreFindings(regression.rows.flatMap((r) => r.capture?.screen.findings ?? []));
  const unsupportedScreenClaimIds = [
    ...new Set(
      regression.rows.flatMap((r) =>
        r.capture ? hasUnsupportedScreenClaims(r.capture.screen) : [],
      ),
    ),
  ];
  await save("results.json", {
    ...regression,
    audits,
    timings,
    findings,
    unsupportedScreenClaimIds,
    browser,
    heldout: {
      count: heldout?.rows.length ?? 0,
      path: "heldout.json",
      workerExitCode: worker.exitCode,
    },
  });
  await writeFile(
    path.join(outputRoot, "summary.md"),
    renderSummary(regression, audits, timings, heldout, browser),
  );
  console.log(
    `regression: ${regression.rows.filter((r) => r.pass).length}/15${regression.mode === "mock" ? " (mock; not clinical metrics)" : ""}`,
  );
  console.log(`held-out: ${heldout?.rows.length ?? 0} situations scored, see file`);
  console.log(`visibility: ${browser.status}${browser.reason ? ` (${browser.reason})` : ""}`);
  const auditFailed = Object.values(audits).some(
    (a) =>
      a.status === "error" ||
      a.traceability?.pass === false ||
      a.composed?.pass === false ||
      !a.availability.pass,
  );
  if (
    regression.rows.some((r) => !r.suitePass) ||
    auditFailed ||
    worker.exitCode !== 0 ||
    browser.status === "failed" ||
    unsupportedScreenClaimIds.length ||
    (regression.mode === "live" &&
      (findings.contradictions !== 5 ||
        findings.matched.some((m) => !m.found) ||
        findings.falseAlarmIds.length > 0))
  )
    process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const suite = parseSuite(process.argv.slice(2));
    if (suite === "real" || suite === "all") await run();
    if (suite === "synthetic" || suite === "all") {
      const { runSynthetic } = await import("./synthetic/run.ts");
      if (!(await runSynthetic())) process.exitCode = 1;
    }
  })().catch(async (error) => {
    await mkdir(outputRoot, { recursive: true });
    const message = error instanceof Error ? error.message : String(error);
    await save("run-error.json", { message });
    console.error("Evaluation could not finish; see eval/output/run-error.json");
    process.exitCode = 1;
  });
}
