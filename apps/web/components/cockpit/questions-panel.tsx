"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReviewEntry, Screen } from "@medlyn/engine/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Question } from "./question";
import type { ReviewHandler } from "./review-controls";

type Props = {
  screen: Screen | null;
  dismissed: { id: string; title: string }[];
  entries: ReviewEntry[];
  onCompare: (id: string) => void;
  onReview: ReviewHandler;
  loading: boolean;
};

export function QuestionsPanel({
  screen,
  dismissed,
  entries,
  onCompare,
  onReview,
  loading,
}: Props) {
  const questions = screen?.openQuestions ?? [];
  return (
    <Card className="rounded-none bg-transparent shadow-none ring-0">
      <CardHeader>
        <CardTitle>Open questions</CardTitle>
        <CardDescription>Uncertainties and missing evidence for this task.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {questions.map((question) => (
          <Question
            key={question.id}
            question={question}
            finding={screen?.findings.find((item) => item.id === question.findingId)}
            author={
              entries.findLast((entry) => entry.targetId === (question.findingId ?? question.id))
                ?.author
            }
            onCompare={onCompare}
            onReview={onReview}
          />
        ))}
        {!questions.length && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {loading ? "Checking eligible documents…" : "No open questions in this lens"}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
        {dismissed.length > 0 && (
          <>
            <Separator />
            <CardTitle>Dismissed · {dismissed.length}</CardTitle>
            {dismissed.map((item) => (
              <Card
                key={item.id}
                size="sm"
                className="rounded-xl border border-gray-alpha-150 shadow-xs ring-0"
              >
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>
                    {entries
                      .findLast((entry) => entry.targetId === item.id)
                      ?.reason?.replaceAll("_", " ")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
