import { describe, expect, it } from "vitest";
import { evaluationReport } from "./evaluation-report.ts";

describe("research report projection", () => {
  it("keeps missing results unmeasured instead of inventing zero scores", () => {
    const report = evaluationReport(
      null,
      { retrieval: { modes: [{ mode: "vector", status: "error" }] } },
      null,
    );
    expect(report.regression.available).toBe(false);
    expect(report.retrieval.modes[0].recallAt5).toBeNull();
    expect(report.synthetic.totals.correct).toBeNull();
    expect(report.verifier.sets).toEqual([]);
  });
  it("exposes only score summaries, never captured patient prose", () => {
    const report = evaluationReport(
      {
        rows: [
          {
            id: "1.1",
            pass: true,
            reason: "private rationale",
            capture: {
              wallMs: 120,
              screen: {
                patient: { displayName: "Private name" },
                sections: [{ text: "Private source text" }],
                findings: [
                  { type: "contradiction", quote: "Private passage" },
                  { type: "needs_clarification" },
                ],
              },
            },
          },
        ],
      },
      null,
      null,
    );
    expect(report.regression.cases[0]).toMatchObject({
      pass: true,
      latencyMs: 120,
      contradictions: 1,
      clarifications: 1,
    });
    expect(JSON.stringify(report)).not.toMatch(/Private|private/);
  });
  it("preserves CI bounds and the separate verifier test-set identities", () => {
    const report = evaluationReport(null, null, {
      sets: {
        synthetic_heldout_families: {
          local_qlora: {
            n: 10,
            macroF1: 0.7,
            macroF1CI95: { low: 0.5, high: 0.9, unit: "patient" },
          },
        },
        real_patient_weak_labels: { local_qlora: { n: 3, macroF1: 0.2 } },
      },
    });
    expect(report.verifier.sets).toHaveLength(2);
    expect(report.verifier.sets[0].methods[0]).toMatchObject({
      low: 0.5,
      high: 0.9,
      intervalUnit: "patient",
    });
    expect(report.verifier.sets[1].methods[0].low).toBeNull();
  });
});
