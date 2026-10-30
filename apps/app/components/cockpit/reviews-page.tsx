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
  const entries = activeReviews(reviews.entries);
  return (
    <PageShell>
      <PageHeading
        title="Reviews"
        description="Your session’s append-only review ledger. Reset the overlay to return to machine output."
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
                  {targets[entry.targetType]} · {entry.targetId}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Badge variant="outline">{actions[entry.action]}</Badge>
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
              Accept, dismiss or leave an item open from Open questions or a clinical situation.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageShell>
  );
}
