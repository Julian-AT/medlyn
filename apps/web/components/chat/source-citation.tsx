"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg bg-background px-2 text-xs font-medium text-primary shadow-none hover:bg-primary/5 hover:text-primary"
            aria-label={`Open source ${index + 1}`}
            onClick={() =>
              window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }))
            }
          >
            <HugeiconsIcon icon={File02Icon} size={14} strokeWidth={1.75} aria-hidden="true" />
            Source {index + 1}
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
              <CardDescription
                lang="de"
                className="line-clamp-5 whitespace-pre-wrap text-sm/relaxed text-foreground"
              >
                {passage.segment.text}
              </CardDescription>
            ) : (
              <Skeleton aria-label="Loading source passage" className="h-20 w-full rounded-lg" />
            )}
          </CardContent>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
}
