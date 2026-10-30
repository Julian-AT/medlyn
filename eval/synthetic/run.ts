import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { evidenceWindow } from "@medlyn/engine/store";
import { getDb } from "@medlyn/engine/db/client";
import { documents } from "@medlyn/engine/db/schema";
import { outputRoot, repoRoot } from "../data.ts";
import { generateChallenges, writeChallenges } from "./challenges.ts";
import { exists, loadPatients } from "./corpus.ts";
import { rubricFallback, SyntheticProvider } from "./provider.ts";
import { scoreScreen } from "./score.ts";
import type { Challenge, SyntheticPatient } from "./types.ts";

type Row = {
  id: string; patientId: string; tier: number; mutationTypes: string[];
  status: "measured" | "error" | "skipped"; reason?: string; wallMs?: number; firstSectionMs?: number; actualTier?: number; actualProfileId?: string | null;
  scores?: Awaited<ReturnType<typeof scoreScreen>>;
};
export function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`Expected positive integer, got ${value}`);
  return parsed;
}

export async function ingestedPatients(): Promise<string[]> {
  const rows = await getDb().selectDistinct({ patientId: documents.patientId }).from(documents);
  return rows.map((row) => row.patientId).filter((id) => id.startsWith("synth-")).sort();
}

export async function pollIngestedPatients(waitSeconds = 30): Promise<string[]> {
  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    const ids = await ingestedPatients();
    if (ids.length || Date.now() >= deadline) return ids;
    console.log("synthetic: waiting for patients in Neon");
    await delay(Math.min(5000, deadline - Date.now()));
  }
}

async function mapBounded<T, R>(values: readonly T[], concurrency: number, run: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(values.length, concurrency) }, async () => {
    while (next < values.length) {
      const index = next++;
      output[index] = await run(values[index]);
    }
  }));
  return output;
}

async function retrieval(patients: SyntheticPatient[]) {
  const modulePath = path.join(repoRoot, "packages/engine/search/eval.ts");
  if (!(await exists(modulePath))) return { status: "unmeasured", reason: "Search lane helper not available" };
  if (!patients.length) return { status: "unmeasured", reason: "No ingested patients with labels" };
  const helper = await import(new URL("../../packages/engine/search/eval.ts", import.meta.url).href) as
    typeof import("@medlyn/engine/search/eval");
  if (typeof helper.evaluateRetrieval !== "function") {
    return { status: "unmeasured", reason: "Search helper does not export evaluateRetrieval", exports: Object.keys(helper) };
  }
  const cases: { id: string; query: string; patientId: string; window: Awaited<ReturnType<typeof evidenceWindow>>;
    relevantSpans: { documentId: string; start: number; end: number }[] }[] = [];
  for (const patient of patients) {
    const window = await evidenceWindow(undefined, patient.patient.id);
    const seen = new Set<string>();
    for (const challenge of generateChallenges([patient], 3)) {
      for (const question of challenge.questions) {
        if (question.type !== "facts" || seen.has(question.needId)) continue;
        seen.add(question.needId);
        cases.push({ id: `${patient.patient.id}-${question.needId}`, query: [...new Set(question.expected.map((fact) => fact.labelEn))].join("; "),
          patientId: patient.patient.id, window, relevantSpans: question.expected.map(({ documentId, start, end }) => ({ documentId, start, end })) });
      }
    }
  }
  const modes = ["bm25", "vector", "hybrid"] as const;
  const results = await mapBounded(modes, 3, async (mode) => {
    if (mode === "vector" && !process.env.GEMINI_API_KEY) return { mode, status: "unmeasured", reason: "GEMINI_API_KEY absent" };
    try {
      const at10 = await helper.evaluateRetrieval(cases, mode, 10);
      if (!at10.metrics.evaluated) return { mode, status: "unmeasured", reason: "No cases with eligible relevant segments" };
      const top5 = at10.results.map((result) => ({
        id: result.id, ...helper.scoreRetrieval(result.retrieved, result.relevant, 5)!,
      }));
      const recallAt5 = top5.reduce((sum, result) => sum + result.recallAtK, 0) / top5.length;
      return { mode, status: "measured", recallAt5,
        recallAt10: at10.metrics.recallAtK, mrrAt10: at10.metrics.mrr,
        evaluated: at10.metrics.evaluated, skipped: at10.metrics.skipped,
        ...(mode === "hybrid" && !process.env.GEMINI_API_KEY ? { degraded: "BM25 only; embedding key absent" } : {}),
        at5: top5, at10 };
    } catch (error) { return { mode, status: "error", reason: message(error) }; }
  });
  const vector = results.find((result) => result.mode === "vector");
  const hybrid = results.find((result) => result.mode === "hybrid");
  if (vector?.status === "error" && hybrid && "at10" in hybrid) {
    hybrid.degraded = `Vector evaluation failed (${vector.reason}); hybrid can contain BM25 fallbacks`;
  }
  return { status: results.some((result) => result.status === "error") ? "error" : "measured", cases: cases.length, modes: results };
}

async function verifier() {
  const file = path.join(repoRoot, "ml/verifier/results.json");
  if (!(await exists(file))) return { status: "unmeasured", reason: "ml/verifier/results.json not present" };
  try { return { status: "reported", source: "ml/verifier/results.json", result: JSON.parse(await readFile(file, "utf8")) }; }
  catch (error) { return { status: "error", reason: message(error) }; }
}
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

function aggregate(rows: Row[]) {
  const measured = rows.filter((row) => row.scores);
  const questions = measured.flatMap((row) => row.scores!.questions);
  return { challenges: rows.length, measured: measured.length,
    passed: measured.filter((row) => row.scores!.pass).length,
    questions: questions.length, correct: questions.filter((q) => q.pass).length,
    errors: rows.filter((row) => row.status === "error").length,
    skipped: rows.filter((row) => row.status === "skipped").length,
    latencyMs: measured.length ? {
      median: measured.map((r) => r.wallMs!).sort((a, b) => a - b)[Math.floor(measured.length / 2)],
      max: Math.max(...measured.map((r) => r.wallMs!)),
    } : null,
    traceability: { located: measured.reduce((n, row) => n + (row.scores!.traceability.located ?? 0), 0),
      checked: measured.reduce((n, row) => n + row.scores!.traceability.checked, 0) },
    findings: { truePositives: measured.reduce((n, row) => n + row.scores!.findings.truePositives, 0),
      expected: measured.reduce((n, row) => n + row.scores!.findings.expected, 0),
      falseAlarms: measured.reduce((n, row) => n + row.scores!.findings.falseAlarms, 0),
      net: measured.reduce((n, row) => n + row.scores!.findings.net, 0) },
  };
}

function integrationSummary(retrievalResult: unknown, verifierResult: unknown): string[] {
  const retrieval = retrievalResult as { status: string; reason?: string; cases?: number;
    modes?: { mode: string; status: string; reason?: string; degraded?: string;
      recallAt5?: number | null; recallAt10?: number; mrrAt10?: number; evaluated?: number }[] };
  const verifier = verifierResult as { status: string; reason?: string; result?: {
    sets?: Record<string, Record<string, { n: number; macroF1: number; coverage: number; latencyMs?: { mean?: number } }>>;
  } };
  const number = (value: number | null | undefined) => value === undefined || value === null ? "—" : value.toFixed(3);
  return [
    `Retrieval: ${retrieval.status}${retrieval.reason ? ` (${retrieval.reason})` : ""}.`, "",
    ...(retrieval.modes ? ["| Mode | Recall@5 | Recall@10 | MRR@10 | Cases | Status |",
      "| --- | ---: | ---: | ---: | ---: | --- |",
      ...retrieval.modes.map((mode) => `| ${mode.mode} | ${number(mode.recallAt5)} | ${number(mode.recallAt10)} | ${number(mode.mrrAt10)} | ${mode.evaluated ?? "—"} | ${mode.degraded ?? mode.reason ?? mode.status} |`), ""] : []),
    `Verifier: ${verifier.status}${verifier.reason ? ` (${verifier.reason})` : ""}.`, "",
    ...(verifier.result?.sets ? ["| Set | Method | n | Macro F1 | Coverage | Mean ms |",
      "| --- | --- | ---: | ---: | ---: | ---: |",
      ...Object.entries(verifier.result.sets).flatMap(([set, methods]) => Object.entries(methods).map(([method, result]) =>
        `| ${set} | ${method} | ${result.n} | ${number(result.macroF1)} | ${number(result.coverage)} | ${number(result.latencyMs?.mean)} |`)), ""] : []),
  ];
}

export function syntheticSummary(rows: Row[], generated: number, patientCount: number,
  retrievalResult: unknown, verifierResult: unknown): string {
  const overall = aggregate(rows);
  const table = (title: string, groups: [string, Row[]][]) => [title, "",
    "| Group | Measured / total | Answers correct / scored | Errors | Skipped |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...groups.map(([key, values]) => { const result = aggregate(values);
      return `| ${key} | ${result.measured}/${result.challenges} | ${result.correct}/${result.questions} | ${result.errors} | ${result.skipped} |`; }), ""];
  const types = ["facts", "gap", "contradictions"];
  return ["<!-- synthetic:start -->", "## Synthetic evaluation", "", `Run: ${new Date().toISOString()}.`, "",
    `Generated: ${generated} challenges over ${patientCount} patients. Three label-derived questions each. Review layer: empty; live cold screens only.`,
    `Measured: ${overall.measured}/${overall.challenges}; answer correctness ${overall.correct}/${overall.questions}. Errors: ${overall.errors}; skipped: ${overall.skipped}.`,
    `Traceability: ${overall.traceability.located}/${overall.traceability.checked} cited facts located. Contradictions: ${overall.findings.truePositives}/${overall.findings.expected}; false alarms ${overall.findings.falseAlarms}; net ${overall.findings.net}. Repeated screens count separately.`,
    `Cold latency: ${overall.latencyMs ? `median ${overall.latencyMs.median.toFixed(0)} ms; max ${overall.latencyMs.max.toFixed(0)} ms` : "unmeasured"}.`, "",
    ...table("By tier", [1, 2, 3].map((tier) => [String(tier), rows.filter((row) => row.tier === tier)])),
    "By challenge type", "", "| Type | Correct / scored |", "| --- | ---: |",
    ...types.map((type) => { const scores = rows.flatMap((r) => r.scores?.questions.filter((q) => q.type === type) ?? []);
      return `| ${type} | ${scores.filter((q) => q.pass).length}/${scores.length} |`; }), "",
    ...table("By mutation type (patients can appear in multiple groups)",
      [...new Set(rows.flatMap((row) => row.mutationTypes.length ? row.mutationTypes : ["none"]))].sort()
        .map((type) => [type, rows.filter((row) => type === "none" ? !row.mutationTypes.length : row.mutationTypes.includes(type))])),
    ...integrationSummary(retrievalResult, verifierResult),
    "Automated synthetic results require human review; they are separate from real-patient regression and held-out scores.",
    "<!-- synthetic:end -->", "",
  ].join("\n");
}

export async function runSynthetic(): Promise<boolean> {
  await mkdir(outputRoot, { recursive: true });
  let ids: string[] = [];
  let discoveryError: string | undefined;
  try { ids = await pollIngestedPatients(positiveInteger(process.env.EVAL_SYNTH_WAIT_SECONDS, 30)); } catch (error) { discoveryError = message(error); }
  const patients = await loadPatients(positiveInteger(process.env.EVAL_SYNTH_PATIENTS, 50), ids);
  const challenges = generateChallenges(patients);
  await writeChallenges(challenges);
  const byPatient = new Map(patients.map((patient) => [patient.patient.id, patient]));
  const ingested = new Set(ids);
  const selected = challenges.filter((challenge) => ingested.has(challenge.patientId));
  const limit = positiveInteger(process.env.EVAL_SYNTH_LIMIT, Math.max(1, selected.length));
  const active = selected.slice(0, limit);
  const provider = new SyntheticProvider();
  const rows: Row[] = challenges.filter((challenge) => !active.includes(challenge)).map((challenge) => ({
    id: challenge.id, patientId: challenge.patientId, tier: challenge.tier, mutationTypes: challenge.mutationTypes,
    status: "skipped", reason: discoveryError ?? (ingested.has(challenge.patientId) ? "EVAL_SYNTH_LIMIT" : "Patient not ingested"),
  }));
  console.log(`synthetic: generated ${challenges.length} challenges / ${patients.length} patients; ${active.length} live screens scheduled (${ids.length} ingested patients)`);
  rows.push(...await mapBounded(active, Math.min(3, positiveInteger(process.env.EVAL_CONCURRENCY, 3)), async (challenge: Challenge): Promise<Row> => {
    const base = { id: challenge.id, patientId: challenge.patientId, tier: challenge.tier, mutationTypes: challenge.mutationTypes };
    try {
      const capture = await provider.capture(challenge);
      const patient = byPatient.get(challenge.patientId)!;
      const scores = await scoreScreen(challenge, capture.screen, capture.evidence, patient.labels.gaps, patient.labels.facts,
        process.env.EVAL_SYNTH_JUDGE === "0" ? undefined : rubricFallback);
      console.log(`synthetic ${challenge.id}: ${scores.questions.filter((q) => q.pass).length}/3; ${capture.wallMs.toFixed(0)} ms`);
      return { ...base, status: "measured", wallMs: capture.wallMs,
        firstSectionMs: capture.screen.timings.firstSectionMs,
        actualTier: capture.screen.situation.tier, actualProfileId: capture.screen.situation.profileId, scores };
    } catch (error) {
      console.error(`synthetic ${challenge.id}: ${message(error)}`);
      return { ...base, status: "error", reason: message(error) };
    }
  }));
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const [retrievalResult, verifierResult] = await Promise.all([
    retrieval(patients.filter((patient) => ingested.has(patient.patient.id))), verifier(),
  ]);
  const result = { generatedAt: new Date().toISOString(), mode: "live", reviewLayer: "empty",
    generated: challenges.length, patientCount: patients.length, ingestedPatientIds: ids, discoveryError,
    totals: aggregate(rows), rows, retrieval: retrievalResult, verifier: verifierResult };
  await writeFile(path.join(outputRoot, "synthetic.json"), `${JSON.stringify(result, null, 2)}\n`);
  const summaryPath = path.join(outputRoot, "summary.md");
  // Append without reading the real-patient summary or its embargoed held-out section.
  await appendFile(summaryPath, `\n${syntheticSummary(rows, challenges.length, patients.length, retrievalResult, verifierResult)}`);
  console.log(`synthetic: ${result.totals.correct}/${result.totals.questions} answers; ${result.totals.measured} measured; ${result.totals.errors} errors; ${result.totals.skipped} skipped`);
  return challenges.length >= 150 && result.totals.measured > 0 && rows.every((row) => row.status === "skipped" || row.scores?.pass) && !discoveryError &&
    retrievalResult.status !== "error" && verifierResult.status !== "error";
}
