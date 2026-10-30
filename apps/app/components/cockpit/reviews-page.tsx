"use client";
import { activeReviews } from "@medlyn/engine/review/overlay";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEvidence } from "@/hooks/use-evidence";

const actions = {
  accept: "Confirmed",
  correct: "Corrected",
  dismiss: "Dismissed",
  leave_open: "Acknowledged, unresolved",
};
const targets = {
  fact: "Fact",
  finding: "Finding",
  card: "Situation card",
  open_question: "Open question",
  letter_claim: "Letter sentence",
};
export function ReviewsPage() {
  const { reviews } = useWorkspace();
  const evidence = useEvidence();
  const entries = activeReviews(reviews.entries);
  const cards = evidence?.sections.flatMap((section) => section.cards) ?? [];
  function targetLabel(entry: (typeof entries)[number]) {
    if (entry.targetType === "card") return cards.find((card) => card.id === entry.targetId)?.title;
    if (entry.targetType === "finding")
      return evidence?.findings.find((finding) => finding.id === entry.targetId)?.title;
    if (entry.targetType === "open_question")
      return evidence?.openQuestions.find((question) => question.id === entry.targetId)?.title;
    if (entry.targetType === "fact")
      return cards
        .flatMap((card) => card.lines)
        .find((line) => line.factIds.includes(entry.targetId))?.text;
    return undefined;
  }
  return (
    <PageShell>
      <PageHeading
        title="Reviews"
        description="Your review decisions for this session. Reset reviews to restore the original source-linked results."
        action={
          <Button variant="outline" disabled={!entries.length} onClick={reviews.reset}>
            Reset review layer
          </Button>
        }
      />
      {reviews.error && (
        <Alert variant="destructive">
          <AlertDescription>{reviews.error}</AlertDescription>
        </Alert>
      )}
      {entries.length ? (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Clinician</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-normal">
                  {targets[entry.targetType]}
                  {targetLabel(entry) && ` · ${targetLabel(entry)}`}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Badge variant="outline">
                    {entry.action === "correct" && entry.supportResult !== "supported"
                      ? "Clinician note"
                      : actions[entry.action]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {entry.reasonText ?? entry.reason?.replaceAll("_", " ") ?? "—"}
                </TableCell>
                <TableCell>{entry.author}</TableCell>
                <TableCell className="whitespace-normal tabular-nums">
                  {new Date(entry.createdAt).toLocaleString("en-GB")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty className="h-72">
          <EmptyHeader>
            <EmptyTitle>No reviews in this session</EmptyTitle>
            <EmptyDescription>
              Accept, correct, dismiss or leave an item open from Open questions or Situations.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageShell>
  );
}
