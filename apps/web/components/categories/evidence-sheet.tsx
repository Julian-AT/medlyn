"use client";

import { SourcePassageContent } from "@/components/sources/source-passage-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EvidenceSheet({
  segmentId,
  onClose,
}: {
  segmentId: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={segmentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle>Source evidence</DialogTitle>
          <DialogDescription>
            The located passage, its translation and neighbouring context.
          </DialogDescription>
        </DialogHeader>
        {segmentId && <SourcePassageContent key={segmentId} segmentId={segmentId} />}
      </DialogContent>
    </Dialog>
  );
}
