"use client";

import { formatDate } from "@medlyn/engine/dates";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSourceResource } from "./hooks/use-source-resource";
import { SourceLanguageToggle } from "./source-language-toggle";
import { SourceLoadState } from "./source-load-state";
import { SourceSegment } from "./source-segment";

export type DocumentReaderDialogProps = {
  documentId: string;
  highlight?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DocumentReaderDialog({
  documentId,
  highlight,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: DocumentReaderDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const [language, setLanguage] = useState("de");
  const { data, error, retry } = useSourceResource("document", open ? documentId : null);
  const body = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!data || !highlight || !open) return;
    const frame = requestAnimationFrame(() => {
      const selected = Array.from(
        body.current?.querySelectorAll<HTMLElement>("[data-segment-id]") ?? [],
      ).find((node) => node.dataset.segmentId === highlight);
      selected?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [data, highlight, open]);
  function changeOpen(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {(trigger || controlledOpen === undefined) && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline" size="sm">
              Open full document
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        className="flex max-h-[90dvh] flex-col gap-4 overflow-hidden p-0 sm:max-w-3xl"
        onOpenAutoFocus={() => {
          if (window.document.activeElement instanceof HTMLElement)
            previousFocus.current = window.document.activeElement;
        }}
        onCloseAutoFocus={(event) => {
          if (previousFocus.current?.isConnected) {
            event.preventDefault();
            previousFocus.current.focus();
          }
        }}
      >
        <DialogHeader className="shrink-0 border-b p-6 pr-16 text-left">
          <DialogTitle className="text-lg leading-6">
            {data?.document.titleEn || data?.document.title || "Source document"}
          </DialogTitle>
          <DialogDescription>
            {data
              ? `${formatDate(data.document.docDate)} · ${data.document.department} · ${data.document.id}`
              : "Full document with its cited passage highlighted."}
          </DialogDescription>
          <SourceLanguageToggle value={language} onChange={setLanguage} />
        </DialogHeader>
        <CardContent
          ref={body}
          className="min-h-0 space-y-2 overflow-y-auto px-4 pb-6 sm:px-6"
          aria-label="Document text"
          role="region"
          tabIndex={0}
        >
          {!data ? (
            <SourceLoadState error={error} retry={retry} />
          ) : (
            data.segments.map((segment) => (
              <SourceSegment
                key={segment.id}
                segment={segment}
                language={language}
                cited={segment.id === highlight}
              />
            ))
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
