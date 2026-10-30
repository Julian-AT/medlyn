import { describe, expect, it } from "vitest";
import { parseSourceResource } from "./source-resource.ts";

const document = {
  id: "demo-doc",
  patientId: "demo-patient",
  revisionId: "demo-revision",
  title: "Example document",
  titleEn: "Example document",
  docType: "example",
  docDate: "2020-01-01",
  department: "Example department",
};
const segment = {
  id: "demo-doc-s0",
  documentId: document.id,
  kind: "sentence",
  section: null,
  start: 0,
  end: 16,
  text: "Example segment.",
  textEn: null,
};
const passage = { document, segment, before: [], after: [] };

describe("source response validation", () => {
  it("accepts the requested passage with an unavailable translation", () => {
    expect(parseSourceResource("passage", segment.id, passage)).toEqual(passage);
  });
  it("accepts the requested document", () => {
    const body = { document, segments: [segment] };
    expect(parseSourceResource("document", document.id, body)).toEqual(body);
  });
  it("rejects a valid passage returned for a different segment", () => {
    expect(() => parseSourceResource("passage", "other-s0", passage)).toThrow(
      "identifier mismatch",
    );
  });
  it("rejects a valid document returned for a different identifier", () => {
    expect(() =>
      parseSourceResource("document", "other-doc", { document, segments: [segment] }),
    ).toThrow("identifier mismatch");
  });
  it("rejects a cited segment from a different document", () => {
    expect(() =>
      parseSourceResource("passage", segment.id, {
        ...passage,
        segment: { ...segment, documentId: "other-doc" },
      }),
    ).toThrow("document mismatch");
  });
  it.each(["before", "after"])("rejects %s context from another document", (side) => {
    expect(() =>
      parseSourceResource("passage", segment.id, {
        ...passage,
        [side]: [{ ...segment, id: "other-s0", documentId: "other-doc" }],
      }),
    ).toThrow("document mismatch");
  });
  it("rejects foreign segments in a full document", () => {
    expect(() =>
      parseSourceResource("document", document.id, {
        document,
        segments: [{ ...segment, documentId: "other-doc" }],
      }),
    ).toThrow("document mismatch");
  });
  it.each([null, {}, { error: "Unavailable" }, { ...passage, segment: null }])(
    "rejects malformed passage data: %j",
    (body) => expect(() => parseSourceResource("passage", segment.id, body)).toThrow(),
  );
});
