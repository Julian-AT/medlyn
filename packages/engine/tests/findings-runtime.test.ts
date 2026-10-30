import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { computeFindings, sameCandidate } from "../findings/index.ts";
import type { CorpusInputDocument, FindingRecord } from "../findings/types.ts";
import { loadCorpus } from "../ingest/corpus.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
if (!process.env.MEDLYN_DATA_PATH && existsSync(path.join(repoRoot, ".env"))) process.loadEnvFile(path.join(repoRoot, ".env"));
const dataPath = process.env.MEDLYN_DATA_PATH ? path.resolve(repoRoot, process.env.MEDLYN_DATA_PATH) : null;
const available = !!dataPath && existsSync(path.join(dataPath, "documents"));

const fixtures = [
  { name: "C1", category: "side", type: "contradiction", refs: [["12340012", 3527], ["12340012", 3716], ["12340012", 3969], ["12340012", 194], ["12340008", 430]] },
  { name: "C2", category: "bmi", type: "contradiction", refs: [["12340012", 1697], ["12340012", 1711], ["12340012", 1726]] },
  { name: "C3", category: "bmi", type: "contradiction", refs: [["12340014", 635], ["12340014", 649], ["12340014", 663]] },
  { name: "C4", category: "same_event_date", type: "contradiction", refs: [["12340016", 187], ["12340018", 1054], ["12340018", 1226], ["12340018", 1381]] },
  { name: "C5", category: "restated_date", type: "contradiction", refs: [["12340018", 173], ["12340018", 2348]] },
  { name: "D1", category: "admission_date", type: "needs_clarification", refs: [["12340018", 145], ["12340014", 1158], ["12340018", 1637]] },
  { name: "D2", category: "lymph_nodes", type: "needs_clarification", refs: [["12340014", 1016], ["12340018", 1340], ["12340016", 925]] },
  { name: "D3", category: "case_id", type: "needs_clarification", refs: [["12340018", 128], ["12340016", 105]] },
] as const;

describe.skipIf(!available)("findings runtime regression", () => {
  let documents: CorpusInputDocument[];
  let records: FindingRecord[];
  beforeAll(async () => {
    documents = loadCorpus(dataPath!).documents;
    records = await computeFindings({ documents, facts: [] }, { llm: false });
  });

  it.each(fixtures)("locates every PRD passage for $name", ({ category, type, refs }) => {
    const finding = records.find((r) => r.category === category && r.passages.some((p) => p.documentId === refs[0][0]));
    expect(finding?.type).toBe(type);
    for (const [documentId, offset] of refs) {
      expect(finding!.passages.some((p) => p.documentId === documentId && p.start <= offset + 35 && p.end >= offset - 10),
        `${category}: missing ${documentId}@${offset}`).toBe(true);
    }
  });

  it("returns exactly five contradictions and three clarification items", () => {
    expect(records.filter((r) => r.type === "contradiction")).toHaveLength(5);
    expect(records.filter((r) => r.type === "needs_clarification")).toHaveLength(3);
  });

  it("keeps every quote located inside its referenced segment", () => {
    for (const finding of records) {
      expect(finding.passages.length).toBeGreaterThanOrEqual(2);
      for (const passage of finding.passages) {
        const document = documents.find((d) => d.doc.id === passage.documentId)!;
        const segment = document.segments.find((s) => s.id === passage.segmentId)!;
        expect(passage.start).toBeGreaterThanOrEqual(segment.start);
        expect(passage.end).toBeLessThanOrEqual(segment.end);
        expect(document.normText.slice(passage.start, passage.end)).toBe(passage.quote);
        expect(passage.claimEn.length).toBeGreaterThan(0);
      }
    }
  });

  it("does not flag the consistent final BMI or any dismissal fixture", () => {
    expect(records.some((r) => r.category === "bmi" && r.passages.some((p) => p.documentId === "12340018"))).toBe(false);
    expect(records.every((r) => fixtures.some((f) => f.category === r.category))).toBe(true);
    expect(records.some((r) => /weight|height|blood.pressure|medication|allergy/i.test(r.title))).toBe(false);
  });

  it("has stable ids regardless of document order", async () => {
    const reversed = await computeFindings({ documents: [...documents].reverse(), facts: [] }, { llm: false });
    expect(reversed.map((r) => r.id).sort()).toEqual(records.map((r) => r.id).sort());
  });

  it("deduplicates the same discharge date evidence across sweep categories without merging the biopsy", () => {
    const discharge = records.find((r) => r.category === "restated_date")!;
    const biopsy = records.find((r) => r.category === "same_event_date")!;
    const sweptDischarge = { ...discharge, deterministic: false, category: "same_event_date" };
    expect(sameCandidate({ ...discharge, deterministic: true }, sweptDischarge)).toBe(true);
    expect(sameCandidate({ ...biopsy, deterministic: false }, sweptDischarge)).toBe(false);
  });

  it.skipIf(process.env.MEDLYN_FINDINGS_LLM !== "1")("runs the live sweep and adjudication", async () => {
    const live = await computeFindings({ documents, facts: [] }, { llm: true });
    const visible = live.filter((r) => r.type !== "dismissed_candidate");
    const additions = live.filter((r) => !records.some((existing) => existing.id === r.id));
    console.log(JSON.stringify({ event: "findings.live_results", baseline: records.length,
      contradictions: visible.filter((r) => r.type === "contradiction").length,
      clarifications: visible.filter((r) => r.type === "needs_clarification").length,
      additions: additions.map(({ category, type, explanation }) => ({ category, type, explanation })),
      adjudications: live.map(({ category, type, explanation }) => ({ category, type, explanation })) }));
    expect(visible.filter((r) => r.type === "contradiction")).toHaveLength(5);
    expect(visible.filter((r) => r.type === "needs_clarification")).toHaveLength(3);
    expect(additions.every((r) => r.type === "dismissed_candidate")).toBe(true);
    for (const finding of visible) {
      expect(finding.explanation).toBe(records.find((r) => r.id === finding.id)!.explanation);
    }
  }, 600_000);
});
