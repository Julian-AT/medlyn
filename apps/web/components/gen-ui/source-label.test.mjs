import { describe, expect, it } from "vitest";
import { sourceLabel } from "./source-label.ts";

const documents = new Map([
  [
    "test-document",
    { id: "test-document", titleEn: "Test discharge letter", docDate: "2020-01-02" },
  ],
]);

describe("tool source labels", () => {
  it("uses English document metadata and its source date", () => {
    expect(
      sourceLabel(
        { segmentId: "test-document-s4", label: "test-document", date: "2019-12-01" },
        documents,
      ),
    ).toMatchObject({ documentId: "test-document", label: "Test discharge letter · 2 Jan 2020" });
  });
  it("honours explicit document identity for arbitrary segment identifiers", () => {
    expect(
      sourceLabel({ segmentId: "arbitrary", documentId: "test-document" }, documents).label,
    ).toBe("Test discharge letter · 2 Jan 2020");
  });
  it("never exposes an internal id while metadata is unavailable", () => {
    expect(
      sourceLabel({ segmentId: "test-document-s4", label: "test-document" }, new Map()).label,
    ).toBe("Source");
  });
});
