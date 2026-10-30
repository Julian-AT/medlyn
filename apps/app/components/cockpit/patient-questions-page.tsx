"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FindingComparator } from "./finding-comparator";
import { usePatientQuestions } from "./hooks/use-patient-questions";
import { Question } from "./question";

const groups = [
  { kind: "contradiction", title: "Contradictions" },
  { kind: "needs_clarification", title: "Needs clarification" },
  { kind: "missing", title: "Documentation gaps" },
] as const;

export function PatientQuestionsPage() {
  const data = usePatientQuestions();
  const [findingId, setFindingId] = useState<string | null>(null);
  const finding = data.findings.find((item) => item.id === findingId);
  return (
    <PageShell>
      <PageHeading
        title="Open questions"
        description="Patient-wide contradictions and clarification requests, with checked gaps from your latest situation."
      />
      {data.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {data.error}
            <Button variant="outline" size="sm" onClick={data.retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {data.loading ? (
        <CardContent className="grid gap-4 p-0 md:grid-cols-2">
          {[0, 1, 2, 3].map((id) => (
            <Skeleton key={id} className="h-48 w-full animate-none rounded-2xl" />
          ))}
        </CardContent>
      ) : (
        groups.map(({ kind, title }) => {
          const questions = data.questions.filter((item) => item.kind === kind);
          return (
            <Card
              key={kind}
              className="min-w-0 gap-4 rounded-none bg-transparent py-0 shadow-none ring-0"
            >
              <CardHeader className="px-0">
                <CardTitle>
                  {title} · {questions.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-0 md:grid-cols-2">
                {questions.map((question) => (
                  <Question
                    key={question.id}
                    question={question}
                    finding={data.findings.find((item) => item.id === question.findingId)}
                    author={
                      data.entries.findLast(
                        (entry) => entry.targetId === (question.findingId ?? question.id),
                      )?.author
                    }
                    onCompare={setFindingId}
                    onReview={data.onReview}
                  />
                ))}
                {!questions.length && (
                  <Card className="col-span-full rounded-2xl p-4 shadow-none ring-1 ring-border">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-0">
                      <CardDescription>
                        {kind === "missing"
                          ? data.hasLens
                            ? "No documentation gaps in the latest situation."
                            : "Run a situation to check gaps."
                          : data.error
                            ? "Couldn't check patient findings."
                            : "No open items in this group."}
                      </CardDescription>
                      {kind === "missing" && !data.hasLens && (
                        <Button asChild variant="outline" size="sm">
                          <Link href="/situations">Run a situation</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
      {data.dismissed.length > 0 && (
        <Card className="rounded-2xl p-4">
          <CardHeader className="p-0">
            <CardTitle>Dismissed · {data.dismissed.length}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {data.dismissed.map((item) => (
              <CardDescription key={item.id}>{item.title}</CardDescription>
            ))}
          </CardContent>
        </Card>
      )}
      <Dialog
        open={Boolean(finding)}
        onOpenChange={(open) => {
          if (!open) setFindingId(null);
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare evidence</DialogTitle>
          </DialogHeader>
          {finding && (
            <FindingComparator
              finding={finding}
              onSource={() => undefined}
              onReview={data.onReview}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
