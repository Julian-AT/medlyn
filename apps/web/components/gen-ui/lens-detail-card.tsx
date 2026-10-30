"use client";

import type { Card as LensCard } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimList } from "./claim-list";
import { displayDates } from "./display-dates";

export function LensDetailCard({
  card,
  sectionTitle,
  compact = false,
}: {
  card: LensCard;
  sectionTitle: string;
  compact?: boolean;
}) {
  return (
    <Card
      size="sm"
      data-card-id={card.id}
      className={`gap-3 rounded-xl border-0 shadow-none ring-0 ${card.critical ? "bg-destructive/5" : "bg-background/60"}`}
    >
      <CardHeader>
        {!compact && <CardDescription className="text-xs">{sectionTitle}</CardDescription>}
        <CardTitle className="text-sm">{card.title}</CardTitle>
        {!compact && <CardDescription className="text-xs/relaxed">{card.why}</CardDescription>}
        <CardContent className="flex flex-wrap gap-1.5 px-0">
          {card.critical && (
            <Badge variant="destructive" className="text-[10px]">
              Critical
            </Badge>
          )}
          {card.completeness === "partial" && (
            <Badge variant="secondary" className="text-[10px]">
              Partial
            </Badge>
          )}
          {card.conflict !== "none" && (
            <Badge
              variant="outline"
              className="border-warning/30 bg-warning/10 text-[10px] text-warning"
            >
              {card.conflict.replaceAll("_", " ")}
            </Badge>
          )}
          {card.review && (
            <Badge variant="secondary" className="text-[10px]">
              {card.review.action}
            </Badge>
          )}
        </CardContent>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {card.availability === "unavailable" ? (
          <CardDescription>Couldn't check</CardDescription>
        ) : (
          <ClaimList
            items={(compact ? card.lines.slice(0, 1) : card.lines).map((line) => ({ line }))}
          />
        )}
        {!compact && card.missing?.length ? (
          <CardDescription className="text-xs">
            Missing: {displayDates(card.missing.join(", "))}
          </CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
}
