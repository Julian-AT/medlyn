"use client";

import type { ClaimLine, Card as ClinicalCard, EvidenceWindow } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { GapCoverage } from "./gap-coverage";
import { ReviewControls, type ReviewHandler, reviewLabel } from "./review-controls";
import { WorkflowStatus } from "./workflow-status";

export function GapCard({
  card,
  absence,
  window,
  onReview,
}: {
  card: ClinicalCard;
  absence: ClaimLine;
  window?: EvidenceWindow;
  onReview: ReviewHandler;
}) {
  return (
    <Card
      size="sm"
      data-card-id={card.id}
      data-need-id={card.needId}
      className="rounded-2xl border border-dashed py-3 shadow-none ring-0"
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
        <CardContent className="min-w-0 flex-1 p-0">
          <WorkflowStatus status="not_documented" />
          <CardTitle className="mt-2 text-sm">{card.title}</CardTitle>
          <CardDescription className="text-xs leading-relaxed">{card.why}</CardDescription>
          <CardDescription
            data-claim-id={absence.id}
            className="text-xs leading-relaxed tabular-nums"
          >
            {absence.text}
          </CardDescription>
          {card.searched && window && !absence.text.includes("searched") && (
            <CardDescription className="text-xs tabular-nums">
              Not documented as of {formatDate(window.asOf)} · searched {card.searched.eligible} of{" "}
              {window.eligibleDocumentIds.length} eligible documents
            </CardDescription>
          )}
          {window && <GapCoverage card={card} window={window} />}
        </CardContent>
        {card.review && <Badge variant="outline">{reviewLabel(card.review.action)}</Badge>}
        <ReviewControls targetType="card" targetId={card.id} onReview={onReview} />
      </CardContent>
    </Card>
  );
}
