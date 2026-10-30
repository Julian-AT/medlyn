"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentReaderDialog } from "./document-reader-dialog";
import { SourcePassageContent } from "./source-passage-content";

export function SourceNavigationDialog() {
  const [source, setSource] = useState<string | null>(null);
  const [document, setDocument] = useState<{ id: string; segmentId?: string } | null>(null);
  useEffect(() => {
    function showSource(event: Event) {
      const detail = (event as CustomEvent<{ segmentId?: unknown }>).detail;
      if (typeof detail?.segmentId === "string") setSource(detail.segmentId);
    }
    function showDocument(event: Event) {
      const detail = (event as CustomEvent<{ id?: unknown; segmentId?: unknown }>).detail;
      if (typeof detail?.id !== "string") return;
      setDocument({
        id: detail.id,
        segmentId: typeof detail.segmentId === "string" ? detail.segmentId : undefined,
      });
    }
    window.addEventListener("medlyn:show-source", showSource);
    window.addEventListener("medlyn:show-document", showDocument);
    return () => {
      window.removeEventListener("medlyn:show-source", showSource);
      window.removeEventListener("medlyn:show-document", showDocument);
    };
  }, []);
  return (
    <>
      <Dialog open={source !== null} onOpenChange={(open) => !open && setSource(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>Source evidence</DialogTitle>
            <DialogDescription>Original passage with neighbouring context.</DialogDescription>
          </DialogHeader>
          {source && <SourcePassageContent key={source} segmentId={source} />}
        </DialogContent>
      </Dialog>
      {document && (
        <DocumentReaderDialog
          documentId={document.id}
          highlight={document.segmentId}
          open
          onOpenChange={(open) => !open && setDocument(null)}
        />
      )}
    </>
  );
}
