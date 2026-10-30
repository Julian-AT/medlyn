import { describe, expect, it } from "vitest";
import type { ReviewEntry, Screen } from "../contracts.ts";
import { mockLensEvents } from "../lens/mock.ts";
import { required } from "../required.ts";
import {
  activeReviews,
  assertReviewAction,
  dismissedItems,
  overlayScreen,
  RESET_TARGET,
  reviewAnnotations,
  reviewLabel,
  reviewTargetHash,
} from "../review/overlay.ts";

function screen(): Screen {
  const start = required(mockLensEvents.find((event) => event.type === "situation"));
  const findings = required(mockLensEvents.find((event) => event.type === "findings"));
  const sections = mockLensEvents.flatMap((event) =>
    event.type === "section" ? [event.section] : [],
  );
  return structuredClone({
    lensKey: start.lensKey,
    patient: start.patient,
    situation: start.situation,
    window: start.window,
    sections,
    critical: findings.critical,
    findings: findings.findings,
    openQuestions: findings.openQuestions,
    timings: { planMs: 0, totalMs: 0, cached: false },
  });
}
const hash = "0123456789abcdef0123456789abcdef";
function entry(fields: Partial<ReviewEntry> = {}): ReviewEntry {
  return {
    id: "r",
    sessionId: "s",
    targetType: "fact",
    targetId: "f-0123456789abcdef",
    targetHash: hash,
    action: "accept",
    author: "Clinician A",
    supportResult: null,
    createdAt: "2026-10-30T05:00:00Z",
    ...fields,
  };
}
function setup() {
  const source = screen();
  const card = required(
    source.sections.flatMap((section) => section.cards).find((card) => card.lines.length),
  );
  card.lines = [{ ...card.lines[0], factIds: ["f-0123456789abcdef"] }];
  return {
    source,
    card,
    output: (value: Screen) =>
      required(
        value.sections.flatMap((section) => section.cards).find((item) => item.id === card.id),
      ),
  };
}
describe("review overlay", () => {
  it("accepts without changing evidence or card state", () => {
    const { source, card, output } = setup();
    const result = output(overlayScreen(source, [entry()]));
    expect(result.review?.action).toBe("accepted");
    expect(result.lines).toEqual(card.lines);
    expect(result.availability).toBe(card.availability);
    expect(card.review).toBeUndefined();
  });
  it("requires rereview on a changed content hash", () => {
    const { source, output } = setup();
    expect(
      output(overlayScreen(source, [entry()], { "f-0123456789abcdef": "changed" })).review?.action,
    ).toBe("needs_rereview");
  });
  it("replaces supported text while preserving citations and the original", () => {
    const { source, card, output } = setup();
    const result = output(
      overlayScreen(source, [
        entry({
          action: "correct",
          proposedText: "Supported correction",
          supportResult: "supported",
        }),
      ]),
    );
    expect(result.lines[0].text).toBe("Supported correction");
    expect(result.review?.action).toBe("corrected");
    expect(result.lines[0].segmentIds).toEqual(card.lines[0].segmentIds);
    expect(result.lines[0].validation.key).toContain(hash);
    expect(card.lines[0].text).not.toBe("Supported correction");
  });
  it("removes a stale derived value when one of its source facts is corrected", () => {
    const { source, card, output } = setup();
    card.lines.push({
      ...card.lines[0],
      id: "derived",
      text: "Synthetic derived value",
      factIds: ["f-0123456789abcdef", "other-fact"],
    });
    const result = output(
      overlayScreen(source, [
        entry({
          action: "correct",
          proposedText: "Supported correction",
          supportResult: "supported",
        }),
      ]),
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe("Supported correction");
    expect(card.lines).toHaveLength(2);
  });
  it("keeps unsupported corrections outside cards", () => {
    const correction = entry({
      action: "correct",
      proposedText: "Clinician observation",
      supportResult: "unsupported",
    });
    const { source } = setup();
    expect(overlayScreen(source, [correction])).toEqual(source);
    expect(reviewAnnotations([correction])[0]).toMatchObject({
      text: "Clinician observation",
      author: "Clinician A",
    });
  });
  it("cannot fill an absent slot with a correction", () => {
    const { source, card, output } = setup();
    card.availability = "not_documented";
    expect(
      output(
        overlayScreen(source, [
          entry({ action: "correct", proposedText: "Changed", supportResult: "supported" }),
        ]),
      ).lines,
    ).toEqual(card.lines);
  });
  it("hides a dismissed finding and its question and exposes dismissed items", () => {
    const source = screen();
    const finding = source.findings[0];
    const dismiss = entry({
      action: "dismiss",
      targetType: "finding",
      targetId: finding.id,
      targetHash: reviewTargetHash(finding),
      reason: "different_context",
    });
    const result = overlayScreen(source, [dismiss]);
    expect(result.findings.some((item) => item.id === finding.id)).toBe(false);
    expect(result.openQuestions.some((item) => item.findingId === finding.id)).toBe(false);
    expect(dismissedItems(source, [dismiss])).toContain(finding);
    expect(source.findings).toContain(finding);
  });
  it("removes the dismissed finding link and conflict without mutating the machine card", () => {
    const { source, card, output } = setup();
    const finding = source.findings[0];
    card.findingIds = [finding.id];
    card.conflict = "contradicted";
    const original = structuredClone(source);
    const dismiss = entry({
      action: "dismiss",
      targetType: "finding",
      targetId: finding.id,
      targetHash: reviewTargetHash(finding),
      reason: "different_context",
    });
    const result = output(overlayScreen(source, [dismiss]));
    expect(result.findingIds).toEqual([]);
    expect(result.conflict).toBe("none");
    expect(result.availability).toBe(card.availability);
    expect(result.completeness).toBe(card.completeness);
    expect(result.lines).toEqual(card.lines);
    expect(source).toEqual(original);
    expect(output(overlayScreen(source, [dismiss, entry({ targetId: RESET_TARGET })]))).toEqual(
      card,
    );
  });
  it("derives conflict from surviving findings, preserving contradiction precedence", () => {
    const { source, card, output } = setup();
    const first = { ...source.findings[0], id: "first", type: "contradiction" as const };
    const clarification = { ...first, id: "clarification", type: "needs_clarification" as const };
    const other = { ...first, id: "other" };
    source.findings = [first, clarification, other];
    card.findingIds = [first.id, clarification.id, other.id, "missing-finding"];
    card.conflict = "contradicted";
    const dismiss = (finding: typeof first) =>
      entry({
        targetType: "finding",
        targetId: finding.id,
        targetHash: reviewTargetHash(finding),
        action: "dismiss",
        reason: "other",
      });
    const oneDismissed = output(overlayScreen(source, [dismiss(first)]));
    expect(oneDismissed.findingIds).toEqual([clarification.id, other.id]);
    expect(oneDismissed.conflict).toBe("contradicted");
    const twoDismissed = output(overlayScreen(source, [dismiss(first), dismiss(other)]));
    expect(twoDismissed.findingIds).toEqual([clarification.id]);
    expect(twoDismissed.conflict).toBe("needs_clarification");
  });
  it("keeps the conflict for a stale dismissal", () => {
    const { source, card, output } = setup();
    const finding = { ...source.findings[0], type: "contradiction" as const };
    source.findings = [finding];
    card.findingIds = [finding.id];
    card.conflict = "contradicted";
    const result = output(
      overlayScreen(source, [
        entry({
          targetType: "finding",
          targetId: finding.id,
          targetHash: "stale",
          action: "dismiss",
          reason: "other",
        }),
      ]),
    );
    expect(result.findingIds).toEqual([finding.id]);
    expect(result.conflict).toBe("contradicted");
  });
  it("lists a directly dismissed missing-information question", () => {
    const source = screen();
    const question = required(source.openQuestions.find((question) => !question.findingId));
    const dismiss = entry({
      action: "dismiss",
      targetType: "open_question",
      targetId: question.id,
      targetHash: reviewTargetHash(question),
      reason: "not_relevant",
    });
    expect(
      overlayScreen(source, [dismiss]).openQuestions.some((item) => item.id === question.id),
    ).toBe(false);
    expect(dismissedItems(source, [dismiss])).toEqual([question]);
  });
  it("does not hide a changed finding", () => {
    const source = screen();
    const result = overlayScreen(source, [
      entry({
        action: "dismiss",
        targetType: "finding",
        targetId: source.findings[0].id,
        targetHash: "stale",
        reason: "other",
      }),
    ]);
    expect(result.findings[0].review?.action).toBe("needs_rereview");
  });
  it("leaves a question open with who and when", () => {
    const source = screen();
    const question = source.openQuestions[0];
    const leave = entry({
      action: "leave_open",
      targetType: "open_question",
      targetId: question.id,
      targetHash: reviewTargetHash(question),
    });
    expect(overlayScreen(source, [leave]).openQuestions[0].review?.action).toBe("left_open");
    expect(reviewLabel(leave)).toContain("Acknowledged, unresolved · Clinician A");
  });
  it("handles a missing finding referenced by an old open question", () => {
    const source = screen();
    const question = required(source.openQuestions.find((question) => question.findingId));
    const leave = entry({
      action: "leave_open",
      targetType: "finding",
      targetId: required(question.findingId),
      targetHash: "old-finding",
    });
    source.findings = [];
    expect(
      overlayScreen(source, [leave]).openQuestions.find((item) => item.id === question.id)?.review
        ?.action,
    ).toBe("needs_rereview");
  });
  it("reset restores machine output while retaining history", () => {
    const entries = [
      entry(),
      entry({ id: "reset", targetId: RESET_TARGET }),
      entry({ id: "later", targetId: "irrelevant" }),
    ];
    expect(activeReviews(entries).map((item) => item.id)).toEqual(["later"]);
    expect(overlayScreen(screen(), entries)).toEqual(screen());
    expect(entries).toHaveLength(3);
  });
  it("validates review-specific requirements", () => {
    expect(() => assertReviewAction(entry({ action: "correct" }))).toThrow("proposed text");
    expect(() => assertReviewAction(entry({ action: "dismiss" }))).toThrow("reason");
    expect(() => assertReviewAction(entry({ targetId: RESET_TARGET }))).toThrow("identity");
  });
});
