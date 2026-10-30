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
      className={`gap-4 rounded-2xl border bg-card p-4 shadow-none ring-0 ${card.critical ? "border-destructive/20" : "border-gray-alpha-150"} ${card.availability === "not_documented" ? "border-dashed" : ""}`}
    >
      <CardHeader className="p-0">
        {!compact && <CardDescription className="text-xs">{sectionTitle}</CardDescription>}
        <CardTitle className="text-sm">{card.title}</CardTitle>
        {!compact && <CardDescription className="text-xs/relaxed">{card.why}</CardDescription>}
        <CardContent className="flex flex-wrap gap-1.5 p-0">
          {card.critical && (
            <Badge variant="destructive" className="text-xs">
              Critical
            </Badge>
          )}
          {card.completeness === "partial" && (
            <Badge
              variant="outline"
              className="border-warning/30 bg-warning/10 text-xs text-warning"
            >
              Partial
            </Badge>
          )}
          {card.conflict !== "none" && (
            <Badge
              variant="outline"
              className="border-warning/30 bg-warning/10 text-xs text-warning"
            >
              {card.conflict.replaceAll("_", " ")}
            </Badge>
          )}
          {card.review && (
            <Badge
              variant={card.review.action === "accepted" ? "outline" : "secondary"}
              className={
                card.review.action === "accepted"
                  ? "border-success/30 bg-success/10 text-xs text-success"
                  : "text-xs"
              }
            >
              {card.review.action.replaceAll("_", " ")}
            </Badge>
          )}
        </CardContent>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
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
