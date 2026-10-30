"use client";

import type { Finding } from "@medlyn/engine/contracts";
import { HighlightDifference } from "@/components/gen-ui/highlight-difference";
import { SourceChips } from "@/components/sources/source-chips";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewControls, type ReviewHandler } from "./review-controls";

export function FindingComparator({
  finding,
  onReview,
}: {
  finding: Finding;
  onSource: (id: string) => void;
  onReview: ReviewHandler;
}) {
  return (
    <Card className="rounded-none bg-transparent shadow-none ring-0">
      <CardHeader>
        <Badge variant="outline" className="w-fit border-warning/40 text-warning">
          {finding.type === "contradiction" ? "Contradiction" : "Needs clarification"}
        </Badge>
        <CardTitle>{finding.title}</CardTitle>
        <CardDescription>{finding.explanation}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {finding.passages.map((passage, index) => (
          <Card
            key={`${passage.segmentId}:${passage.start}:${passage.end}`}
            size="sm"
            className="rounded-xl border-0 bg-gray-alpha-50 shadow-none ring-0"
          >
            <CardHeader>
              <CardDescription className="break-all font-mono text-xs">
                Passage {index + 1}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <CardDescription lang="de" className="text-sm leading-relaxed text-foreground">
                <HighlightDifference
                  text={passage.quote}
                  other={finding.passages
                    .filter((other) => other !== passage)
                    .map((other) => other.quote)
                    .join(" ")}
                />
              </CardDescription>
              <CardDescription className="text-sm">{passage.claimEn}</CardDescription>
            </CardContent>
            <CardFooter>
              <SourceChips
                sources={[{ documentId: passage.documentId, segmentId: passage.segmentId }]}
              />
            </CardFooter>
          </Card>
        ))}
        {finding.computation && (
          <CardDescription className="col-span-full font-mono">
            {finding.computation}
          </CardDescription>
        )}
        {finding.hypothesisText && (
          <CardDescription className="col-span-full">{finding.hypothesisText}</CardDescription>
        )}
      </CardContent>
      <CardFooter>
        <ReviewControls
          targetId={finding.id}
          targetType="finding"
          onReview={onReview}
          allowDismiss
        />
      </CardFooter>
    </Card>
  );
}
