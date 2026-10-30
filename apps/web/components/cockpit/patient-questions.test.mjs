import { reviewTargetHash } from "@medlyn/engine/review/overlay";
import { describe, expect, it } from "vitest";
import { patientQuestions } from "./patient-questions.ts";

const window = { asOf: "2020-01-01", corpusRevision: "r1", eligibleDocumentIds: ["d1", "d2"] };
const finding = { id: "f1", type: "contradiction", title: "Example discrepancy" };
const lens = {
  patient: { id: "example" },
  window,
  openQuestions: [{ id: "gap", kind: "missing", title: "Example checked gap" }],
};
describe("patient-wide questions", () => {
  it("shows findings without requiring a clinical situation", () => {
    const result = patientQuestions([finding], null, window, "example", []);
    expect(result.visible.map((question) => question.kind)).toEqual(["contradiction"]);
    expect(result.hasLens).toBe(false);
  });
  it("adds gaps only for the identical patient and evidence window", () => {
    expect(patientQuestions([], lens, window, "example", []).visible).toHaveLength(1);
    expect(
      patientQuestions([], lens, { ...window, corpusRevision: "r2" }, "example", []).visible,
    ).toEqual([]);
    expect(
      patientQuestions([], lens, { ...window, eligibleDocumentIds: ["d1"] }, "example", []).visible,
    ).toEqual([]);
    expect(patientQuestions([], lens, window, "another", []).visible).toEqual([]);
    expect(
      patientQuestions([], lens, { ...window, eligibleDocumentIds: ["d2", "d1"] }, "example", [])
        .visible,
    ).toHaveLength(1);
  });
  it("keeps an acknowledged item open and applies dismissals by content hash", () => {
    const review = {
      targetId: finding.id,
      targetType: "finding",
      targetHash: reviewTargetHash(finding),
      action: "leave_open",
      createdAt: "2020-01-01",
    };
    expect(
      patientQuestions([finding], null, window, "example", [review]).visible[0].review.action,
    ).toBe("left_open");
    const dismissed = patientQuestions([finding], null, window, "example", [
      { ...review, action: "dismiss" },
    ]);
    expect(dismissed.visible).toEqual([]);
    expect(dismissed.dismissed).toHaveLength(1);
    expect(
      patientQuestions([{ ...finding, title: "Changed finding" }], null, window, "example", [
        { ...review, action: "dismiss" },
      ]).visible[0].review.action,
    ).toBe("needs_rereview");
  });
});
