"use client";
import { ArrowUpRight } from "lucide-react";
import type { Finding, OpenQuestion } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { ReviewControls, reviewLabel, type ReviewHandler } from "./ReviewControls";
export function Question({
  question,
  finding,
  author,
  onCompare,
  onReview,
}: {
  question: OpenQuestion;
  finding?: Finding;
  author?: string;
  onCompare: (id: string) => void;
  onReview: ReviewHandler;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <Badge
          variant="outline"
          className={question.kind === "missing" ? "w-fit" : "w-fit border-warning/40 text-warning"}
        >
          {question.kind.replaceAll("_", " ")}
        </Badge>
        <CardTitle>{question.title}</CardTitle>
        {question.review && (
          <CardDescription>
            {reviewLabel(question.review.action)}
            {author && ` · ${author}`} · {new Date(question.review.at).toLocaleString("en-GB")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("medlyn:investigate", {
                detail: { question, finding },
              }),
            )
          }
        >
          Investigate
          <ArrowUpRight data-icon="inline-end" />
        </Button>
        {finding && (
          <Button variant="outline" size="sm" onClick={() => onCompare(finding.id)}>
            Compare sources
          </Button>
        )}
      </CardContent>
      <CardFooter className="justify-end py-1">
        <ReviewControls
          targetType={finding ? "finding" : "open_question"}
          targetId={finding?.id ?? question.id}
          onReview={onReview}
          allowDismiss
        />
      </CardFooter>
    </Card>
  );
}
