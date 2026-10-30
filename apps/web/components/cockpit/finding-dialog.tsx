"use client";

import type { Finding } from "@medlyn/engine/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FindingComparator } from "./finding-comparator";
import type { ReviewHandler } from "./review-controls";

export function FindingDialog({
  finding,
  onClose,
  onReview,
}: {
  finding: Finding | null;
  onClose: () => void;
  onReview: ReviewHandler;
}) {
  return (
    <Dialog open={finding !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare sources</DialogTitle>
          <DialogDescription>Review the passages behind this finding.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70dvh]">
          {finding && <FindingComparator finding={finding} onReview={onReview} />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
