"use client";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  Card as ClinicalCard,
  EvidenceWindow,
  Finding,
  OpenQuestion,
} from "@medlyn/engine/contracts";
import { SourceChips } from "@/components/sources/source-chips";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GapCoverage } from "./gap-coverage";
import { investigationContext } from "./investigation-context";
import { ReviewControls, type ReviewHandler, reviewLabel } from "./review-controls";
import { questionStatus } from "./workflow-state";
import { WorkflowStatus } from "./workflow-status";
export function Question({
  question,
  finding,
  author,
  card,
  window: evidenceWindow,
  onCompare,
  onReview,
}: {
  question: OpenQuestion;
  finding?: Finding;
  author?: string;
  card?: ClinicalCard;
  window?: EvidenceWindow;
  onCompare: (id: string) => void;
  onReview: ReviewHandler;
}) {
  return (
    <Card
      size="sm"
      className="min-w-0 rounded-2xl border border-gray-alpha-150 p-4 shadow-none ring-0"
    >
      <CardHeader className="p-0">
        <WorkflowStatus status={questionStatus(question, card)} />
        <CardTitle>{question.title}</CardTitle>
        {card?.availability === "unavailable" && (
          <CardDescription>
            The check did not finish. Retry this situation before drawing a conclusion.
          </CardDescription>
        )}
        {question.review && (
          <CardDescription>
            {reviewLabel(question.review.action)}
            {author && ` · ${author}`} · {new Date(question.review.at).toLocaleString("en-GB")}
          </CardDescription>
        )}
      </CardHeader>
      {card?.lines
        .filter((line) => line.kind === "absence" && line.validation.support === "supported")
        .map((line) => (
          <CardDescription key={line.id} className="text-xs">
            {line.text}
          </CardDescription>
        ))}
      <CardContent className="flex flex-wrap gap-2 p-0">
        <Button
          className="h-8 rounded-control"
          size="sm"
          variant="secondary"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("medlyn:investigate", {
                detail: {
                  question: { ...question, title: investigationContext(question, finding, card) },
                  finding,
                },
              }),
            )
          }
        >
          Investigate
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            strokeWidth={2}
            aria-hidden="true"
            data-icon="inline-end"
          />
        </Button>
        {card && evidenceWindow && <GapCoverage card={card} window={evidenceWindow} />}
        {finding && (
          <Button
            className="h-8 rounded-control"
            variant="outline"
            size="sm"
            onClick={() => onCompare(finding.id)}
          >
            Compare sources
          </Button>
        )}
      </CardContent>
      {finding && (
        <CardContent className="p-0">
          <SourceChips
            sources={finding.passages.map((passage) => ({
              segmentId: passage.segmentId,
              documentId: passage.documentId,
            }))}
          />
        </CardContent>
      )}
      <CardFooter className="justify-end p-0">
        <ReviewControls
          targetType={finding ? "finding" : "open_question"}
          targetId={finding?.id ?? question.id}
          onReview={onReview}
          allowDismiss
          allowCorrect={Boolean(finding?.passages.some((passage) => passage.factId))}
          correctionTargets={finding?.passages.flatMap((passage) =>
            passage.factId ? [{ id: passage.factId, label: passage.claimEn }] : [],
          )}
        />
      </CardFooter>
    </Card>
  );
}
