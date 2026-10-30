"use client";

import {
  AlertCircleIcon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  DashedLineCircleIcon,
  ShieldAlertIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Card as ClinicalCard } from "@medlyn/engine/contracts";
import { motion } from "motion/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { showClaim } from "@/lib/lens-state";
import { cn } from "@/lib/utils";
import { FactLines } from "./fact-lines";
import { ReviewControls, type ReviewHandler, reviewLabel } from "./review-controls";

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
  const absence = card.lines.find((line) => line.kind === "absence" && showClaim(line));
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
        "h-full rounded-2xl border shadow-none ring-0",
        card.availability === "not_documented" && "border border-dashed ring-0",
      )}
    >
      <CardHeader>
        <CardTitle className="font-semibold tracking-tight">{card.title}</CardTitle>
        <CardDescription>{card.why}</CardDescription>
        {card.critical && (
          <CardAction>
            <Badge variant="destructive">
              <HugeiconsIcon icon={ShieldAlertIcon} strokeWidth={2} aria-hidden="true" />
              Critical
            </Badge>
          </CardAction>
        )}
        {!card.critical && card.availability === "documented" && card.lines.some(showClaim) && (
          <CardAction>
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={18}
              strokeWidth={1.75}
              className="text-primary"
              aria-label="Source-linked facts"
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {card.conflict !== "none" && conflict && (
          <Badge
            asChild
            variant="outline"
            className="w-fit border-warning/30 bg-warning/10 text-warning"
          >
            <button type="button" onClick={() => onFinding(conflict)}>
              {card.conflict === "contradicted" ? "Contradiction" : "Needs clarification"}
              <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} aria-hidden="true" />
            </button>
          </Badge>
        )}
        {card.headline && showClaim(card.headline) && (
          <CardDescription className="text-foreground">{card.headline.text}</CardDescription>
        )}
        {card.availability === "not_documented" && absence ? (
          <Empty className="p-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={DashedLineCircleIcon} strokeWidth={2} aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Evidence gap</EmptyTitle>
              <EmptyDescription data-claim-id={absence.id}>{absence.text}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : card.availability === "unavailable" || card.availability === "not_documented" ? (
          <Alert>
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} aria-hidden="true" />
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
