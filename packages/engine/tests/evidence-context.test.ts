import { describe, expect, it } from "vitest";
import type { DocumentView } from "../contracts.ts";
import { passageContext } from "../evidence/passage.ts";

const document: DocumentView = {
  document: { id: "doc", patientId: "p", revisionId: "r", title: "Synthetic", titleEn: "Synthetic", docType: "test", docDate: "2020-01-01", department: "Test" },
  segments: Array.from({ length: 7 }, (_, i) => ({ id: `doc-s${i}`, documentId: "doc", kind: "sentence", section: null, start: i * 10, end: i * 10 + 4, text: `Row${i}`, textEn: `English${i}` })),
};

describe("passage context", () => {
  it("returns two ordered neighbors on each side with translations", () => {
    const result = passageContext(document, "doc-s3");
    expect(result.before.map((segment) => segment.id)).toEqual(["doc-s1", "doc-s2"]);
    expect(result.after.map((segment) => segment.id)).toEqual(["doc-s4", "doc-s5"]);
    expect(result.segment.textEn).toBe("English3");
  });
  it("clips at document edges and never borrows another document", () => {
    expect(passageContext(document, "doc-s0").before).toEqual([]);
    expect(passageContext(document, "doc-s6").after).toEqual([]);
    expect(() => passageContext(document, "other-s0")).toThrow("Segment not found");
  });
});
