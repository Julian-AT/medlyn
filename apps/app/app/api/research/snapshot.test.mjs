import { afterEach, describe, expect, it, vi } from "vitest";
import snapshot from "../../../data/research-snapshot.json";
import { GET as cohort } from "./cohort/route.ts";
import { quantumReport } from "./evaluation/quantum-report.ts";
import { GET as evaluation } from "./evaluation/route.ts";

afterEach(() => vi.unstubAllEnvs());

describe("bundled research snapshot", () => {
  it("serves the committed reports in production without reading local research files", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await (await cohort()).json()).toEqual(snapshot.cohort);
    const report = await (await evaluation()).json();
    expect(report.regression).toEqual(snapshot.evaluation.regression);
    expect(report.quantum).toEqual(snapshot.quantum);
    expect(report.metrics.review).toContain("not clinician-reviewed");
  });

  it("ships at most twenty fresh synthetic samples and excludes evidence bodies", () => {
    expect(snapshot.cohort.samples.length).toBeGreaterThan(0);
    expect(snapshot.cohort.samples.length).toBeLessThanOrEqual(20);
    for (const sample of snapshot.cohort.samples) {
      expect(sample.id).toMatch(/^synth-/);
    }
    const keys = [];
    function collect(value) {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        keys.push(key);
        collect(child);
      }
    }
    collect(snapshot);
    for (const key of ["quote", "rawText", "normText", "capture"]) {
      expect(keys).not.toContain(key);
    }
    for (const source of snapshot.sources) {
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.path).not.toMatch(/heldout|blind|^\//);
    }
  });

  it("keeps absent quantum measurements unmeasured and drops arbitrary run content", () => {
    const report = quantumReport({
      kernel: { models: { quantum_fidelity: { accuracy: 0.5, passage: "PRIVATE" } } },
      hardware: { token: "PRIVATE" },
      dataset: { trainIds: ["PRIVATE"], train: 400 },
    });
    expect(report.models[0]).toMatchObject({ accuracy: 0.5, low: null, high: null });
    expect(report.models[1].accuracy).toBeNull();
    expect(JSON.stringify(report)).not.toContain("PRIVATE");
    expect(quantumReport(null).available).toBe(false);
  });
});
