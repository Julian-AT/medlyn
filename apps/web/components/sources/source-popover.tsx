"use client";

import { type ReactElement, useState } from "react";
import { SourceOverlay } from "./source-overlay";
import { SourcePassageContent } from "./source-passage-content";

export type SourcePopoverProps = {
  segmentId: string;
  documentId?: string;
  trigger: ReactElement;
};

export function SourcePopover({ segmentId, documentId, trigger }: SourcePopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <SourceOverlay title="Source evidence" trigger={trigger} open={open} onOpenChange={setOpen}>
      {open && <SourcePassageContent segmentId={segmentId} documentId={documentId} />}
    </SourceOverlay>
  );
}
