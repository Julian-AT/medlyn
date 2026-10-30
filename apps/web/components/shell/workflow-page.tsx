"use client";
import Link from "next/link";
import { useState } from "react";
import { EvidenceSheet } from "@/components/categories/evidence-sheet";
import { PageHeading } from "@/components/categories/page-heading";
import { FindingComparator } from "@/components/cockpit/finding-comparator";
import { LetterPanel } from "@/components/cockpit/letter-panel";
import { QuestionsPanel } from "@/components/cockpit/questions-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "./workspace-provider";

const descriptions = {
  questions: "Uncertainties and missing evidence in the active clinical situation.",
  letter: "Draft a source-linked follow-up letter from the active clinical situation.",
  reviews: "Your session’s review overlay. Original documents and machine facts stay intact.",
};
export function WorkflowPage({ view }: { view: "questions" | "letter" | "reviews" }) {
  const { sessionId, reviews } = useWorkspace();
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [findingId, setFindingId] = useState<string | null>(null);
  const finding = reviews.screen?.findings.find((item) => item.id === findingId);
  return (
    <Card className="gap-8 rounded-none bg-transparent mx-auto w-full max-w-[1100px] px-4 py-6 shadow-none ring-0 md:px-8 md:py-8">
      <CardContent className="flex flex-col gap-8 px-0">
        <PageHeading
          title={
            view === "questions" ? "Open questions" : view === "letter" ? "GP letter" : "Reviews"
          }
          description={descriptions[view]}
        />
        {reviews.error && (
          <Alert>
            <AlertDescription>{reviews.error}</AlertDescription>
          </Alert>
        )}
        {view === "reviews" ? (
          reviews.entries.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reviewed by</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.targetType.replaceAll("_", " ")} · {entry.targetId}
                    </TableCell>
                    <TableCell>{entry.action.replaceAll("_", " ")}</TableCell>
                    <TableCell>{entry.author}</TableCell>
                    <TableCell>{new Date(entry.createdAt).toLocaleString("en-GB")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <WorkflowEmpty title="No reviews in this session" />
          )
        ) : !reviews.screen ? (
          <WorkflowEmpty title="Choose a clinical situation first" />
        ) : view === "letter" ? (
          <LetterPanel
            sessionId={sessionId}
            lensKey={reviews.screen.lensKey}
            reviewVersion={reviews.entries.length}
            onSource={setSegmentId}
          />
        ) : (
          <QuestionsPanel
            screen={reviews.screen}
            dismissed={reviews.dismissed}
            entries={reviews.entries}
            onCompare={setFindingId}
            onReview={reviews.onReview}
            loading={false}
          />
        )}{" "}
        {finding && (
          <FindingComparator
            finding={finding}
            onSource={setSegmentId}
            onReview={reviews.onReview}
          />
        )}
        <EvidenceSheet segmentId={segmentId} onClose={() => setSegmentId(null)} />
      </CardContent>
    </Card>
  );
}
function WorkflowEmpty({ title }: { title: string }) {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          Open Situations to investigate a task, review the evidence and carry your work here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href="/situations">Open Situations</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
