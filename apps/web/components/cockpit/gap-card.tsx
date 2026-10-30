"use client";

import type { ClaimLine, Card as ClinicalCard } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ReviewControls, type ReviewHandler, reviewLabel } from "./review-controls";

export function GapCard({
  card,
  absence,
  onReview,
}: {
  card: ClinicalCard;
  absence: ClaimLine;
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
          <CardTitle className="text-sm" title={card.why}>
            {card.title}
          </CardTitle>
          <CardDescription
            data-claim-id={absence.id}
            className="text-xs leading-relaxed tabular-nums"
          >
            {absence.text}
          </CardDescription>
        </CardContent>
        {card.review && <Badge variant="outline">{reviewLabel(card.review.action)}</Badge>}
        <ReviewControls targetType="card" targetId={card.id} onReview={onReview} />
      </CardContent>
    </Card>
  );
}
