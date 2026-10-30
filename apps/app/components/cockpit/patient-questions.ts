import type {
  EvidenceWindow,
  Finding,
  OpenQuestion,
  ReviewEntry,
  Screen,
} from "@medlyn/engine/contracts";
import { activeReviews, reviewMatches } from "@medlyn/engine/review/overlay";

export function patientQuestions(
  findings: Finding[],
  lens: Screen | null,
  window: EvidenceWindow | null,
  patientId: string,
  entries: ReviewEntry[],
) {
  const hasLens = Boolean(
    window &&
      lens &&
      lens.patient.id === patientId &&
      window.asOf === lens.window.asOf &&
      window.corpusRevision === lens.window.corpusRevision &&
      JSON.stringify([...window.eligibleDocumentIds].sort()) ===
        JSON.stringify([...lens.window.eligibleDocumentIds].sort()),
  );
  const questions: OpenQuestion[] = [
    ...findings.map((finding) => ({
      id: `question-${finding.id}`,
      kind: finding.type,
      title: finding.title,
      findingId: finding.id,
    })),
    ...(hasLens
      ? (lens?.openQuestions.filter((question) => question.kind === "missing") ?? [])
      : []),
  ];
  const active = activeReviews(entries);
  const dismissed: OpenQuestion[] = [];
  const visible = questions.flatMap((question) => {
    const target = findings.find((finding) => finding.id === question.findingId) ?? question;
    const entry = active.findLast(
      (entry) =>
        (entry.targetType === (question.findingId ? "finding" : "open_question") &&
          entry.targetId === target.id) ||
        (entry.targetType === "card" && entry.targetId === question.cardId),
    );
    if (!entry) return [question];
    const reviewed =
      entry.targetType === "card"
        ? lens?.sections
            .flatMap((section) => section.cards)
            .find((card) => card.id === question.cardId)
        : target;
    const matches = reviewMatches(entry, reviewed);
    if (matches && entry.action === "dismiss") {
      dismissed.push(question);
      return [];
    }
    const actions = {
      accept: "accepted",
      correct: "corrected",
      dismiss: "dismissed",
      leave_open: "left_open",
    } as const;
    return [
      {
        ...question,
        review: {
          action: matches ? actions[entry.action] : ("needs_rereview" as const),
          at: entry.createdAt,
        },
      },
    ];
  });
  return { questions, visible, dismissed, hasLens };
}
