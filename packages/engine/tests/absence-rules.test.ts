import { describe, expect, it } from "vitest";
import { checkDocumented, containsSynonym } from "../lens/absence.ts";
import type { Document, EvidenceWindow, Segment } from "../contracts.ts";

const window: EvidenceWindow = { asOf: "2020-01-02", eligibleDocumentIds: ["a"], corpusRevision: "r1" };
const doc: Document & { normText: string } = { id: "a", patientId: "p", revisionId: "r1", title: "Synthetic", titleEn: "Synthetic", docType: "test", docDate: "2020-01-01", department: "Test", normText: "Marker alpha." };
const segment: Segment = { id: "a-s0", documentId: "a", kind: "sentence", section: null, start: 0, end: 13, text: doc.normText, textEn: null };
const sources = { documents: [doc], segments: [segment], total: 2 };

describe("absence checks", () => {
  it("matches German umlaut forms and full words without substring hits", () => {
    expect(containsSynonym("Größe und FUẞ", ["Groesse"])).toBe(true);
    expect(containsSynonym("Größe und FUẞ", ["Fuss"])).toBe(true);
    expect(containsSynonym("markerized", ["marker"])).toBe(false);
    expect(containsSynonym("[marker]", ["marker"])).toBe(true);
    expect(containsSynonym("a+b", ["a+b"])).toBe(true);
    expect(containsSynonym("anything", [""])).toBe(false);
  });

  it("requires the full document pass even when lexical search hits", async () => {
    let calls = 0;
    const result = await checkDocumented("marker", [], window, { ...sources, search: async (_, docs) => {
      calls++;
      expect(docs[0].normText).toBe(doc.normText);
      return [];
    } });
    expect(calls).toBe(1);
    expect(result.status).toBe("documented");
    expect(result.segmentIds).toEqual(["a-s0"]);
  });

  it("returns not documented only after both searches are empty", async () => {
    const result = await checkDocumented("absent token", [], window, { ...sources, search: async () => [] });
    expect(result).toEqual({ status: "not_documented", concept: "absent token", searched: { eligible: 1, total: 2, asOf: window.asOf }, segmentIds: [] });
  });

  it("uses semantic hits outside the literal synonyms", async () => {
    const result = await checkDocumented("other phrase", [], window, { ...sources, search: async () => ["a-s0"] });
    expect(result.status).toBe("documented");
  });

  it("excludes later documents and rejects invented segment ids", async () => {
    const later = { ...doc, id: "later", docDate: "2021-01-01" };
    const result = await checkDocumented("absent", [], window, { ...sources, documents: [doc, later], search: async (_, docs) => {
      expect(docs.map((entry) => entry.id)).toEqual(["a"]);
      return ["invented"];
    } });
    expect(result.status).toBe("unavailable");
  });

  it("does not turn missing document text or model failures into gaps", async () => {
    for (const opts of [
      { ...sources, documents: [], search: async () => [] },
      { ...sources, search: async () => { throw new Error("transport failed"); } },
    ]) {
      expect((await checkDocumented("absent", [], window, opts)).status).toBe("unavailable");
    }
  });

  it("has an overall deadline including the full text pass", async () => {
    const result = await checkDocumented("absent", [], window, { ...sources, timeoutMs: 10, search: () => new Promise(() => undefined) });
    expect(result.status).toBe("unavailable");
  });
});
