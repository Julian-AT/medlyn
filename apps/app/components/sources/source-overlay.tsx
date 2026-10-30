"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactElement, type ReactNode, useId } from "react";
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
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { useSourceMobile } from "./hooks/use-source-mobile";

export function SourceOverlay({
  title,
  trigger,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const mobile = useSourceMobile();
  const titleId = useId();
  function keepReaderOpen(event: Event) {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-slot="dialog-content"], [data-slot="dialog-overlay"]')
    )
      event.preventDefault();
  }
  if (mobile)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[85dvh] gap-4 overflow-y-auto p-5">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Original evidence and available translation.</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        aria-labelledby={titleId}
        onInteractOutside={keepReaderOpen}
        onFocusOutside={keepReaderOpen}
        className="max-h-[min(80dvh,var(--radix-popover-content-available-height))] w-[30rem] max-w-[calc(100vw-2rem)] gap-4 overflow-y-auto rounded-2xl p-5 shadow-natural-sm"
      >
        <CardContent className="flex items-center justify-between gap-3 p-0">
          <PopoverTitle id={titleId}>{title}</PopoverTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close source"
            onClick={() => onOpenChange(false)}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
          </Button>
        </CardContent>
        {children}
      </PopoverContent>
    </Popover>
  );
}
