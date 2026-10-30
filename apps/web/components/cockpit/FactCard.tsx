"use client";

import { motion } from "motion/react";
import { AlertCircle, ArrowRight, CircleDashed, ShieldAlert } from "lucide-react";
import type { Card as ClinicalCard } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { showClaim } from "@/lib/lens-state";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { FactLines } from "./FactLines";
import { ReviewControls, reviewLabel, type ReviewHandler } from "./ReviewControls";

const MotionCard = motion.create(Card);
type Props = {
  card: ClinicalCard;
  onSource: (id: string) => void;
  onFinding: (id: string) => void;
  onRetry: () => void;
  onReview: ReviewHandler;
  activeFindingIds: string[];
};

export function FactCard({
  card,
  onSource,
  onFinding,
  onRetry,
  onReview,
  activeFindingIds,
}: Props) {
  const conflict = card.findingIds.find((id) => activeFindingIds.includes(id));
  const corrections = card.lines
    .filter((line) => line.factIds.length === 1)
    .map((line) => ({ id: line.factIds[0], label: line.text }));
  return (
    <MotionCard
      size="sm"
      layout
      layoutId={`need-${card.needId}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      data-card-id={card.id}
      data-need-id={card.needId}
      className={cn(
        "h-full",
        card.availability === "not_documented" && "border border-dashed ring-0",
      )}
    >
      <CardHeader>
        <CardTitle>{card.title}</CardTitle>
        <CardDescription>{card.why}</CardDescription>
        {card.critical && (
          <CardAction>
            <Badge variant="destructive">
              <ShieldAlert />
              Critical
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {card.conflict !== "none" && conflict && (
          <Badge asChild variant="outline" className="w-fit border-warning/40 text-warning">
            <button onClick={() => onFinding(conflict)}>
              {card.conflict === "contradicted" ? "Contradiction" : "Needs clarification"}
              <ArrowRight />
            </button>
          </Badge>
        )}
        {card.headline && showClaim(card.headline) && <p>{card.headline.text}</p>}
        {card.availability === "not_documented" ? (
          <Empty className="p-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleDashed />
              </EmptyMedia>
              <EmptyTitle>
                Not documented as of {formatDate(card.searched?.asOf ?? "2016-04-15")}
              </EmptyTitle>
              {card.searched && (
                <EmptyDescription>
                  searched {card.searched.eligible} of {card.searched.total} eligible documents
                </EmptyDescription>
              )}
            </EmptyHeader>
          </Empty>
        ) : card.availability === "unavailable" ? (
          <Alert>
            <AlertCircle />
            <AlertTitle>Couldn't check</AlertTitle>
            <AlertDescription>
              <p>The evidence check did not complete.</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry check
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <FactLines lines={card.lines} onSource={onSource} />
        )}
        {card.completeness === "partial" && (
          <Alert>
            <AlertTitle>
              <Badge variant="secondary">Partial</Badge>
            </AlertTitle>
            <AlertDescription>
              Missing: {card.missing?.join(" · ") ?? "Additional details"}
            </AlertDescription>
          </Alert>
        )}
        {card.review && (
          <Badge variant="secondary" className="w-fit">
            {reviewLabel(card.review.action)}
          </Badge>
        )}
      </CardContent>
      <CardFooter className="justify-end py-1">
        <ReviewControls
          targetId={card.id}
          targetType="card"
          onReview={onReview}
          allowCorrect={card.availability === "documented" && corrections.length > 0}
          correctionTargets={corrections}
        />
      </CardFooter>
    </MotionCard>
  );
}
