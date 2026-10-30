import {
  label,
  list,
  number,
  record,
  text,
} from "../../../../components/research/report-values.ts";

export function evaluationReport(
  regressionValue: unknown,
  syntheticValue: unknown,
  verifierValue: unknown,
) {
  const regression = record(regressionValue),
    synthetic = record(syntheticValue),
    verifier = record(verifierValue);
  const cases = list(regression.rows).map((value) => {
    const row = record(value),
      capture = record(row.capture),
      screen = record(capture.screen),
      timings = record(screen.timings);
    const findings = list(screen.findings);
    return {
      id: text(row.id),
      pass: row.pass === true,
      answer: number(record(row.namedScores).answer),
      citation: number(record(row.namedScores).citation),
      latencyMs: number(capture.wallMs) ?? number(timings.totalMs),
      phase: text(capture.phase),
      contradictions: findings.filter((item) => record(item).type === "contradiction").length,
      clarifications: findings.filter((item) => record(item).type === "needs_clarification").length,
    };
  });
  const retrieval = record(synthetic.retrieval);
  const verifierSets = Object.entries(record(verifier.sets)).map(([key, value]) => ({
    id: key,
    label: label(key),
    methods: Object.entries(record(value)).map(([method, value]) => {
      const result = record(value),
        interval = record(result.macroF1CI95),
        latency = record(result.latencyMs);
      return {
        method: label(method),
        n: number(result.n),
        macroF1: number(result.macroF1),
        low: number(interval.low),
        high: number(interval.high),
        intervalUnit: text(interval.unit),
        p50Ms: number(latency.p50),
        p95Ms: number(latency.p95),
        coverage: number(result.coverage),
        ece: number(record(result.calibration).ece),
      };
    }),
  }));
  return {
    available: regressionValue !== null || syntheticValue !== null || verifierValue !== null,
    regression: { available: regressionValue !== null, mode: text(regression.mode), cases },
    synthetic: {
      available: syntheticValue !== null,
      generatedAt: text(synthetic.generatedAt),
      totals: {
        measured: number(record(synthetic.totals).measured),
        skipped: number(record(synthetic.totals).skipped),
        passed: number(record(synthetic.totals).passed),
        questions: number(record(synthetic.totals).questions),
        correct: number(record(synthetic.totals).correct),
      },
    },
    retrieval: {
      status: text(retrieval.status),
      cases: number(retrieval.cases),
      modes: list(retrieval.modes).map((value) => {
        const mode = record(value);
        return {
          label: label(text(mode.mode)),
          status: text(mode.status),
          recallAt5: number(mode.recallAt5),
          recallAt10: number(mode.recallAt10),
          mrrAt10: number(mode.mrrAt10),
          evaluated: number(mode.evaluated),
        };
      }),
    },
    verifier: {
      sets: verifierSets,
      status: label(text(verifier.status)),
      training: text(verifier.v2TrainingStatus),
      cascade: text(verifier.cascadeStatus),
      limitations: list(verifier.limitations).map(text),
    },
    heldout: "Real blind held-out results remain closed until the orchestrator's H+7 review.",
  };
}
export type EvaluationReport = ReturnType<typeof evaluationReport>;
