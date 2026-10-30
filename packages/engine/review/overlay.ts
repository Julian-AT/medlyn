import type {
  Annotation,
  Card,
  Finding,
  OpenQuestion,
  ReviewEntry,
  ReviewRequest,
  Screen,
} from "../contracts.ts";
import { required } from "../required.ts";
export const RESET_TARGET = "__review_reset__";
export type FactHashes = Readonly<Record<string, string>>;
export function activeReviews(entries: ReviewEntry[]): ReviewEntry[] {
  const reset = entries.findLastIndex((entry) => entry.targetId === RESET_TARGET);
  return entries.slice(reset + 1);
}
/** A portable identity for UI targets; fact reviews use the ingest content hash. */
export function reviewTargetHash(value: unknown): string {
  const text =
    JSON.stringify(value, (key, item) => (key === "review" ? undefined : item)) ?? "missing";
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `ui-${(hash >>> 0).toString(16)}`;
}
export function reviewMatches(
  entry: ReviewEntry,
  target: unknown,
  hashes: FactHashes = {},
): boolean {
  if (entry.targetType !== "fact")
    return target != null && entry.targetHash === reviewTargetHash(target);
  const hash = hashes[entry.targetId];
  if (hash) return hash === entry.targetHash;
  return entry.targetId === `f-${entry.targetHash.slice(0, 16)}`;
}
function targetsCard(entry: ReviewEntry, card: Card): boolean {
  if (entry.targetType === "card") return entry.targetId === card.id;
  return (
    entry.targetType === "fact" && card.lines.some((line) => line.factIds.includes(entry.targetId))
  );
}
function badge(entry: ReviewEntry, matches: boolean): NonNullable<Card["review"]> {
  const actions = {
    accept: "accepted",
    correct: "corrected",
    dismiss: "dismissed",
    leave_open: "left_open",
  } as const;
  return { action: matches ? actions[entry.action] : "needs_rereview", at: entry.createdAt };
}
export function reviewAnnotations(entries: ReviewEntry[]): Annotation[] {
  return activeReviews(entries)
    .filter(
      (entry) =>
        entry.action === "correct" && entry.supportResult !== "supported" && entry.proposedText,
    )
    .map((entry) => ({
      id: entry.id,
      text: required(entry.proposedText),
      author: entry.author,
      targetId: entry.targetId,
      createdAt: entry.createdAt,
    }));
}
export function dismissedItems(screen: Screen, entries: ReviewEntry[]): (Finding | OpenQuestion)[] {
  const active = activeReviews(entries);
  const findings = screen.findings.filter((finding) => {
    const entry = active.findLast(
      (item) => item.targetType === "finding" && item.targetId === finding.id,
    );
    return entry?.action === "dismiss" && reviewMatches(entry, finding);
  });
  const findingIds = new Set(findings.map((finding) => finding.id));
  const questions = screen.openQuestions.filter((question) => {
    if (question.findingId && findingIds.has(question.findingId)) return false;
    const entry = active.findLast(
      (item) => item.targetType === "open_question" && item.targetId === question.id,
    );
    return entry?.action === "dismiss" && reviewMatches(entry, question);
  });
  return [...findings, ...questions];
}
export function reviewLabel(entry: ReviewEntry): string {
  if (entry.action === "leave_open")
    return `Acknowledged, unresolved · ${entry.author} · ${entry.createdAt}`;
  if (entry.action === "accept") return `Confirmed · ${entry.author} · ${entry.createdAt}`;
  return `${entry.action === "correct" ? "Corrected" : "Dismissed"} · ${entry.author} · ${entry.createdAt}`;
}
/** Apply session reviews to machine output. The input and its evidence remain untouched. */
export function overlayScreen(
  screen: Screen,
  entries: ReviewEntry[],
  hashes: FactHashes = {},
): Screen {
  const active = activeReviews(entries);
  const dismissed = new Set(dismissedItems(screen, active).map((finding) => finding.id));
  const visibleFindings = new Map(
    screen.findings
      .filter((finding) => !dismissed.has(finding.id))
      .map((finding) => [finding.id, finding]),
  );
  const sections = screen.sections.map((section) => ({
    ...section,
    cards: section.cards.map((original) => {
      const findingIds = original.findingIds.filter((id) => visibleFindings.has(id));
      const linked = findingIds.map((id) => required(visibleFindings.get(id)));
      const conflict: Card["conflict"] = linked.some((finding) => finding.type === "contradiction")
        ? "contradicted"
        : linked.length
          ? "needs_clarification"
          : "none";
      let card = {
        ...original,
        findingIds,
        conflict,
        lines: original.lines.map((line) => ({ ...line })),
      };
      for (const entry of active.filter((item) => targetsCard(item, original))) {
        if (entry.action === "dismiss") continue;
        if (
          entry.action === "correct" &&
          (entry.supportResult !== "supported" || entry.targetType !== "fact")
        )
          continue;
        const matches = reviewMatches(entry, original, hashes);
        card = { ...card, review: badge(entry, matches) };
        if (
          matches &&
          entry.action === "correct" &&
          entry.proposedText &&
          card.availability === "documented"
        ) {
          const hasAtomicLine = card.lines.some(
            (line) => line.factIds.length === 1 && line.factIds[0] === entry.targetId,
          );
          card.lines = card.lines.flatMap((line) => {
            if (!line.factIds.includes(entry.targetId)) return [line];
            // A derived calculation cannot retain its old value after an input correction.
            if (line.factIds.length > 1 && hasAtomicLine) return [];
            return [
              {
                ...line,
                text: required(entry.proposedText),
                factIds: [entry.targetId],
                kind: "composed" as const,
                author: "clinician" as const,
                validation: {
                  key: JSON.stringify({
                    patientId: screen.patient.id,
                    corpusRevision: screen.window.corpusRevision,
                    asOf: screen.window.asOf,
                    eligibleDocumentIds: [...screen.window.eligibleDocumentIds].sort(),
                    validatorIdentity: line.validation.key,
                    text: required(entry.proposedText)
                      .normalize("NFC")
                      .replace(/\s+/gu, " ")
                      .trim(),
                    facts: [[entry.targetId, entry.targetHash]],
                    segmentIds: [...line.segmentIds].sort(),
                    reviewId: entry.id,
                  }),
                  support: "supported" as const,
                },
              },
            ];
          });
        }
      }
      return card;
    }),
  }));
  const findings = screen.findings
    .filter((finding) => !dismissed.has(finding.id))
    .map((finding) => {
      const entry = active.findLast(
        (item) => item.targetType === "finding" && item.targetId === finding.id,
      );
      return entry ? { ...finding, review: badge(entry, reviewMatches(entry, finding)) } : finding;
    });
  const openQuestions = screen.openQuestions
    .filter((question) => !question.findingId || !dismissed.has(question.findingId))
    .flatMap((question) => {
      const entry = active.findLast(
        (item) =>
          (item.targetType === "open_question" && item.targetId === question.id) ||
          (item.targetType === "finding" && item.targetId === question.findingId) ||
          (item.targetType === "card" && item.targetId === question.cardId),
      );
      if (!entry) return [question];
      const target =
        entry.targetType === "finding"
          ? screen.findings.find((finding) => finding.id === question.findingId)
          : entry.targetType === "card"
            ? screen.sections
                .flatMap((section) => section.cards)
                .find((card) => card.id === question.cardId)
            : question;
      const matches = reviewMatches(entry, target);
      if (matches && entry.action === "dismiss") return [];
      return [{ ...question, review: badge(entry, matches) }];
    });
  return { ...screen, sections, findings, openQuestions };
}
export function assertReviewAction(req: ReviewRequest): void {
  if (
    !req.sessionId.trim() ||
    !req.author.trim() ||
    !req.targetHash.trim() ||
    req.targetId === RESET_TARGET
  )
    throw new Error("Invalid review identity");
  if (req.action === "correct" && (req.targetType !== "fact" || !req.proposedText?.trim()))
    throw new Error("A correction needs a fact and proposed text");
  if (
    req.action === "dismiss" &&
    (!req.reason || !["finding", "open_question"].includes(req.targetType))
  )
    throw new Error("A dismissal needs a finding or open question and a reason");
}
