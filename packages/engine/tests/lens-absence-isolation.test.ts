import { afterEach, describe, expect, it, vi } from "vitest";
import type { Document, Segment } from "../contracts.ts";
import { checkDocumented } from "../lens/absence.ts";

const window = { asOf: "2025-01-01", corpusRevision: "test-revision", eligibleDocumentIds: ["d"] };
const document: Document & { normText: string } = {
  id: "d",
  patientId: "synth-one",
  revisionId: window.corpusRevision,
  title: "Synthetic",
  titleEn: "Synthetic",
  docType: "test",
  docDate: window.asOf,
  department: "Test",
  normText: "Example marker.",
};
const segment: Segment = {
  id: "d-s0",
  documentId: "d",
  kind: "sentence",
  section: null,
  start: 0,
  end: document.normText.length,
  text: document.normText,
  textEn: null,
};

afterEach(() => vi.unstubAllEnvs());

describe("absence patient and retrieval boundaries", () => {
  it("rejects supplied evidence for a different patient or revision", async () => {
    const options = {
      documents: [document],
      segments: [segment],
      total: 1,
      search: async () => [],
    };
    expect(
      (await checkDocumented("Absent marker", [], window, { ...options, patientId: "synth-two" }))
        .status,
    ).toBe("unavailable");
    expect(
      (
        await checkDocumented("Absent marker", [], window, {
          ...options,
          documents: [{ ...document, revisionId: "stale" }],
        })
      ).status,
    ).toBe("unavailable");
  });

  it("preserves unavailable when lexical retrieval fails after a complete negative text pass", async () => {
    vi.stubEnv("DATABASE_URL", "synthetic-test");
    const result = await checkDocumented("Missing marker", [], window, {
      patientId: "synth-one",
      documents: [document],
      segments: [segment],
      total: 1,
      search: async () => [],
      candidateSearch: async () => {
        throw new Error("Synthetic lexical failure");
      },
    });
    expect(result.status).toBe("unavailable");
    expect(result.segmentIds).toEqual([]);
  });
});
