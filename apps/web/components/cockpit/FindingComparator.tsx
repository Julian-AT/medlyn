"use client";

import type { Finding } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ReviewControls, type ReviewHandler } from "./ReviewControls";

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
        {finding.passages.map((passage, index) => (
          <Card key={`${passage.segmentId}-${index}`} size="sm">
            <CardHeader>
              <CardDescription className="break-all font-mono text-xs">
                {passage.documentId}@{passage.start}–{passage.end}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p lang="de" className="text-sm leading-relaxed">
                {highlight(passage.quote, finding)}
              </p>
              <p className="text-sm text-muted-foreground">{highlight(passage.claimEn, finding)}</p>
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

function highlight(text: string, finding: Finding) {
  return text
    .split(/(rechts|links|right|left|\d+(?:[.,]\d+)?(?:%|\.\d+\.\d+)?)/gi)
    .map((token, index) => {
      if (!/^(rechts|links|right|left|\d)/i.test(token)) return token;
      const shared = finding.passages.every((passage) =>
        `${passage.quote} ${passage.claimEn}`.toLowerCase().includes(token.toLowerCase()),
      );
      return shared ? (
        token
      ) : (
        <mark className="rounded bg-warning/20 px-0.5 text-warning" key={index}>
          {token}
        </mark>
      );
    });
}
