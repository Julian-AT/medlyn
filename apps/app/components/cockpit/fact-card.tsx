"use client";

import type { Card as ClinicalCard, EvidenceWindow } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showClaim } from "@/lib/lens-state";
import { cn } from "@/lib/utils";
import { FactLines } from "./fact-lines";
import { GapCard } from "./gap-card";
import { ReviewControls, type ReviewHandler, reviewLabel } from "./review-controls";
import { WorkflowStatus } from "./workflow-status";

type Props = {
  card: ClinicalCard;
  window?: EvidenceWindow;
  onFinding: (id: string) => void;
  onRetry: () => void;
  onReview: ReviewHandler;
  activeFindingIds: string[];
};

export function FactCard({ card, window, onFinding, onRetry, onReview, activeFindingIds }: Props) {
  const absence = card.lines.find((line) => line.kind === "absence" && showClaim(line));
  const conflict = card.findingIds.find((id) => activeFindingIds.includes(id));
  const corrections = card.lines
    .filter((line) => showClaim(line) && line.factIds.length === 1)
    .map((line) => ({ id: line.factIds[0], label: line.text }));
  if (card.availability === "not_documented" && absence)
    return <GapCard card={card} window={window} absence={absence} onReview={onReview} />;
  return (
    <Card
      size="sm"
      data-card-id={card.id}
      data-need-id={card.needId}
      className={cn(
        "gap-3 overflow-visible rounded-2xl border p-4 shadow-none ring-0",
        card.critical && "border-destructive/20 bg-destructive/5",
      )}
    >
      <CardHeader className="gap-1 px-0">
        <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">{card.why}</CardDescription>
        <CardAction className="flex items-center gap-1">
          <ReviewControls
            targetId={card.id}
            targetType="card"
            onReview={onReview}
            allowCorrect={card.availability === "documented" && corrections.length > 0}
            correctionTargets={corrections}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-0">
        {card.conflict !== "none" && conflict && (
          <WorkflowStatus
            status={card.conflict === "contradicted" ? "contradiction" : "needs_clarification"}
            onCompare={() => onFinding(conflict)}
          />
        )}
        {card.headline && showClaim(card.headline) && (
          <CardDescription className="text-foreground" data-claim-id={card.headline.id}>
            {card.headline.text}
          </CardDescription>
        )}
        {card.availability !== "documented" ? (
          <CardContent className="flex flex-wrap items-center justify-between gap-2 px-0">
            <WorkflowStatus status="unavailable" />
            <CardDescription>The evidence check did not complete.</CardDescription>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry check
            </Button>
          </CardContent>
        ) : (
          <FactLines lines={card.lines} />
        )}
        {card.completeness === "partial" && (
          <CardDescription className="text-xs">
            <Badge variant="outline" className="mr-2 border-warning/30 bg-warning/10 text-warning">
              Partial
            </Badge>
            {card.missing?.length
              ? `Missing: ${card.missing.join(" · ")}`
              : "Additional details are incomplete."}
          </CardDescription>
        )}
        {card.review && (
          <Badge
            variant="outline"
            className={cn(
              "w-fit",
              card.review.action === "accepted" && "border-success/30 bg-success/10 text-success",
            )}
          >
            {reviewLabel(card.review.action)}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
