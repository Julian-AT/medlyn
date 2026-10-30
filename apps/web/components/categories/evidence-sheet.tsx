"use client";
import { EvidencePanel } from "@/components/cockpit/evidence-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
export function EvidenceSheet({
  segmentId,
  onClose,
}: {
  segmentId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={!!segmentId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Source evidence</SheetTitle>
          <SheetDescription>
            The located passage, its translation and surrounding document.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <EvidencePanel
            segmentId={segmentId}
            finding={null}
            screen={null}
            onSource={() => undefined}
            onReview={async () => {
              throw new Error("Open Situations to review a finding");
            }}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
