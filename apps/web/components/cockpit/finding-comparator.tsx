"use client";

import type { Finding } from "@medlyn/engine/contracts";
import { HighlightDifference } from "@/components/gen-ui/highlight-difference";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onSource,
  onReview,
}: {
  finding: Finding;
  onSource: (id: string) => void;
  onReview: ReviewHandler;
}) {
  return (
    <Card className="bg-transparent ring-0">
      <CardHeader>
        <Badge variant="outline" className="w-fit border-warning/40 text-warning">
          {finding.type.replaceAll("_", " ")}
        </Badge>
        <CardTitle>{finding.title}</CardTitle>
        <CardDescription>{finding.explanation}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {finding.passages.map((passage) => (
          <Card
            key={`${passage.segmentId}:${passage.start}:${passage.end}`}
            size="sm"
            className="rounded-xl border shadow-none ring-0"
          >
            <CardHeader>
              <CardDescription className="break-all font-mono text-xs">
                {passage.documentId}@{passage.start}–{passage.end}
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
              <Button variant="link" size="sm" onClick={() => onSource(passage.segmentId)}>
                Open in document
              </Button>
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
