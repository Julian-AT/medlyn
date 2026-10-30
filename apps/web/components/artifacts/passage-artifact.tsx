"use client";

import { formatDate } from "@medlyn/engine/dates";
import { useSourcePassage } from "@/components/chat/hooks/use-source-passage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { openArtifact } from "./artifact-state";

export function PassageArtifact({ segmentId }: { segmentId: string }) {
  const { passage, error, retry } = useSourcePassage(segmentId);
  if (error)
    return (
      <CardDescription>
        Couldn't load this source.{" "}
        <Button variant="link" onClick={retry}>
          Retry
        </Button>
      </CardDescription>
    );
  if (!passage)
    return <Skeleton className="h-56 w-full rounded-2xl" aria-label="Loading source passage" />;
  return (
    <Card className="gap-5 rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="gap-2 px-0">
        <CardTitle className="text-lg">{passage.document.titleEn}</CardTitle>
        <CardDescription className="text-xs">
          {formatDate(passage.document.docDate)} · {passage.document.department} ·{" "}
          {passage.document.id}
        </CardDescription>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2 w-fit rounded-full"
          onClick={() => openArtifact({ kind: "document", id: passage.document.id, segmentId })}
        >
          Open full document
        </Button>
      </CardHeader>
      {[...passage.before, passage.segment, ...passage.after].map((segment) => (
        <Card
          key={segment.id}
          className={`gap-3 rounded-2xl border-0 p-4 shadow-none ring-0 ${segment.id === segmentId ? "bg-muted" : "bg-transparent"}`}
        >
          <CardDescription className="text-xs font-medium">
            {segment.section ?? "Passage"}
            {segment.id === segmentId ? " · Cited passage" : " · Context"}
          </CardDescription>
          <CardContent className="space-y-3 px-0">
            <CardDescription
              lang="de"
              className={`whitespace-pre-wrap text-sm/relaxed ${segment.id === segmentId ? "rounded-md bg-warning/10 text-foreground" : "text-muted-foreground"}`}
            >
              {segment.text}
            </CardDescription>
            <CardDescription lang="en" className="whitespace-pre-wrap text-sm/relaxed">
              {segment.textEn ?? "English translation unavailable."}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </Card>
  );
}
