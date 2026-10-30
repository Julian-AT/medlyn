import { describe, expect, it } from "vitest";
import { stageKey } from "../ingest/multimodal/stages.ts";
import { toDocument } from "../ingest/multimodal/to-document.ts";

const document = toDocument(
  [
    {
      page: 1,
      imagePath: "/private/tmp/page.png",
      width: 100,
      height: 200,
      dpi: 200,
      source: "embedded",
      lines: [{ text: "Test", words: [], bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } }],
    },
  ],
  { id: "doc", patientId: "patient", date: "2026-10-30", title: "Test" },
).document;

describe("runtime stage identity", () => {
  it("separates patient, revision, window metadata, source text and segment identity", () => {
    const key = stageKey("semantic", [document], []);
    expect(stageKey("semantic", [document], [])).toBe(key);
    for (const changed of [
      { ...document, doc: { ...document.doc, patientId: "other" } },
      { ...document, doc: { ...document.doc, revisionId: "other" } },
      { ...document, doc: { ...document.doc, docDate: "2026-10-29" } },
      { ...document, normText: "different" },
      { ...document, segments: document.segments.map((segment) => ({ ...segment, id: "other" })) },
    ])
      expect(stageKey("semantic", [changed], [])).not.toBe(key);
    expect(stageKey("extract", [document], [])).not.toBe(key);
  });
});
