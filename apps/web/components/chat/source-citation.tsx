"use client";

import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
} from "@/components/ai-elements/inline-citation";
import { useSourcePassage } from "@/components/chat/hooks/use-source-passage";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";

export function SourceCitation({ segmentId, index }: { segmentId: string; index: number }) {
  const [open, setOpen] = useState(false);
  const { passage, error, retry } = useSourcePassage(open ? segmentId : null);
  return (
    <InlineCitation>
      <InlineCitationCard open={open} onOpenChange={setOpen}>
        <HoverCardTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="mx-0.5 inline-flex h-5 min-w-5 rounded-md px-1 align-baseline text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Open source ${index + 1}`}
            onClick={() =>
              window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }))
            }
          >
            [{index + 1}]
          </Button>
        </HoverCardTrigger>
        <InlineCitationCardBody className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-border shadow-sm">
          <CardHeader className="gap-1 p-4">
            <CardTitle className="text-sm font-medium">
              {passage?.document.titleEn ?? "Source passage"}
            </CardTitle>
            <CardDescription className="text-xs">
              {passage
                ? `${formatDate(passage.document.docDate)} · ${passage.document.id}`
                : segmentId}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {error ? (
              <CardDescription>
                Couldn't load this source.{" "}
                <Button variant="link" size="sm" className="h-auto p-0" onClick={retry}>
                  Retry
                </Button>
              </CardDescription>
            ) : passage ? (
              <CardContent className="space-y-3 px-0">
                <CardDescription
                  lang="de"
                  className="line-clamp-3 whitespace-pre-wrap text-sm/relaxed text-foreground"
                >
                  {passage.segment.text}
                </CardDescription>
                <CardDescription
                  lang="en"
                  className="line-clamp-3 whitespace-pre-wrap text-xs/relaxed"
                >
                  {passage.segment.textEn ?? "English translation unavailable."}
                </CardDescription>
              </CardContent>
            ) : (
              <Skeleton aria-label="Loading source passage" className="h-20 w-full rounded-lg" />
            )}
          </CardContent>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
}
