"use client";

import { formatDate } from "@medlyn/engine/dates";
import { useRef, useState } from "react";
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
import { canOpenCitation } from "./citation-interaction";

export function SourceCitation({ segmentId, index }: { segmentId: string; index: number }) {
  const [open, setOpen] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const { passage, error, retry } = useSourcePassage(open ? segmentId : null);
  return (
    <InlineCitation className="select-none align-super leading-none">
      <InlineCitationCard
        openDelay={300}
        closeDelay={120}
        open={open}
        onOpenChange={(value) => {
          if (!value || window.getSelection()?.isCollapsed !== false) setOpen(value);
        }}
      >
        <HoverCardTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="mx-0.5 inline-flex h-4 min-w-4 select-none rounded-full bg-muted px-1 text-[10px]/none font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Open source ${index + 1}`}
            onPointerDown={(event) => {
              pointer.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
            onClick={(event) => {
              const activate = canOpenCitation({
                keyboard: event.detail === 0,
                hasSelection: window.getSelection()?.isCollapsed === false,
                start: pointer.current,
                end: { x: event.clientX, y: event.clientY },
              });
              pointer.current = null;
              if (!activate) return;
              setOpen(false);
              window.dispatchEvent(
                new CustomEvent("medlyn:show-source", { detail: { segmentId } }),
              );
            }}
          >
            {index + 1}
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
