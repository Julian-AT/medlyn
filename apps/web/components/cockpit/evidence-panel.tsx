"use client";

import { FileSearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Finding, Screen } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEvidence } from "@/hooks/use-evidence";
import { cn } from "@/lib/utils";
import { FindingComparator } from "./finding-comparator";
import type { ReviewHandler } from "./review-controls";

type Props = {
  segmentId: string | null;
  finding: Finding | null;
  screen: Screen | null;
  onSource: (id: string) => void;
  onReview: ReviewHandler;
};

export function EvidencePanel({ segmentId, finding, screen, onSource, onReview }: Props) {
  const { language, setLanguage, passage, document, error, loading, selected, retry } = useEvidence(
    segmentId,
    finding !== null,
  );
  if (finding)
    return <FindingComparator finding={finding} onSource={onSource} onReview={onReview} />;
  if (!segmentId)
    return (
      <Empty className="min-h-80">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={FileSearchIcon} strokeWidth={2} aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Follow a fact to its source</EmptyTitle>
          <EmptyDescription>
            Select a source chip to read the exact German passage, its translation and the
            surrounding document.
          </EmptyDescription>
        </EmptyHeader>
        {screen && (
          <Card size="sm" className="w-full max-w-xs">
            <CardHeader>
              <CardDescription>Evidence window</CardDescription>
              <CardTitle className="font-mono">{formatDate(screen.window.asOf)}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {screen.window.eligibleDocumentIds.length} eligible documents
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </Empty>
    );
  const metadata = document?.document ?? passage?.document;
  const segments =
    document?.segments ?? (passage ? [...passage.before, passage.segment, ...passage.after] : []);
  return (
    <Card className="bg-transparent ring-0">
      <CardHeader>
        <CardDescription>Source document</CardDescription>
        <CardTitle>{metadata?.titleEn ?? "Loading evidence…"}</CardTitle>
        {metadata && (
          <CardDescription className="font-mono text-xs">
            {formatDate(metadata.docDate)} · {metadata.id}
          </CardDescription>
        )}
        <ToggleGroup
          type="single"
          value={language}
          onValueChange={(value) => value && setLanguage(value)}
          variant="outline"
          size="sm"
          aria-label="Passage language"
        >
          <ToggleGroupItem value="de" aria-label="German source">
            DE
          </ToggleGroupItem>
          <ToggleGroupItem value="en" aria-label="English translation">
            EN
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert>
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" onClick={retry}>
                Retry source
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {loading && <Skeleton className="h-36 w-full" />}
        {segments.map((segment) => (
          <Card
            key={segment.id}
            size="sm"
            className={cn(
              "ring-0",
              segment.id === passage?.segment.id
                ? "bg-primary/10 ring-1 ring-primary/40"
                : "bg-transparent",
            )}
          >
            <CardContent>
              <p
                ref={segment.id === passage?.segment.id ? selected : undefined}
                data-segment-id={segment.id}
                lang={language}
                className="whitespace-pre-wrap text-sm leading-relaxed"
              >
                {language === "en" && !segment.textEn && <BadgeTranslation />}
                {language === "de" ? segment.text : (segment.textEn ?? segment.text)}
              </p>
            </CardContent>
          </Card>
        ))}
      </CardContent>
      {passage && (
        <CardFooter>
          <CardDescription className="font-mono text-xs">
            {passage.document.id}@{passage.segment.start}–{passage.segment.end}
          </CardDescription>
        </CardFooter>
      )}
    </Card>
  );
}

function BadgeTranslation() {
  return (
    <>
      <em>Translation unavailable · German source</em>
      <br />
    </>
  );
}
