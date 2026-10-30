"use client";

import {
  Cancel01Icon,
  Clock01Icon,
  Edit02Icon,
  MoreHorizontalCircle01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReviewRequest } from "@medlyn/engine/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReviewDialog } from "./review-dialog";

export type ReviewHandler = (
  targetType: ReviewRequest["targetType"],
  targetId: string,
  action: ReviewRequest["action"],
  extras?: Pick<ReviewRequest, "reason" | "proposedText">,
) => Promise<void>;
type Props = {
  targetId: string;
  targetType: ReviewRequest["targetType"];
  onReview: ReviewHandler;
  allowDismiss?: boolean;
  allowCorrect?: boolean;
  correctionTargets?: { id: string; label: string }[];
};

export function ReviewControls({
  targetId,
  targetType,
  onReview,
  allowDismiss = false,
  allowCorrect = false,
  correctionTargets = [],
}: Props) {
  const [mode, setMode] = useState<"correct" | "dismiss" | null>(null);
  const [busy, setBusy] = useState(false);
  async function act(
    action: ReviewRequest["action"],
    extras?: Pick<ReviewRequest, "reason" | "proposedText">,
    factId?: string,
  ) {
    setBusy(true);
    try {
      await onReview(
        action === "correct" ? "fact" : targetType,
        action === "correct" ? (factId ?? targetId) : targetId,
        action,
        extras,
      );
      setMode(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review could not be saved. Retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => act("accept")}>
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-icon="inline-start"
        />
        Accept
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={busy} aria-label="More review actions">
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {allowCorrect && (
              <DropdownMenuItem onSelect={() => setMode("correct")}>
                <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} aria-hidden="true" />
                Correct
              </DropdownMenuItem>
            )}
            {allowDismiss && (
              <DropdownMenuItem onSelect={() => setMode("dismiss")}>
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden="true" />
                Dismiss with reason
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => act("leave_open")}>
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} aria-hidden="true" />
              Leave open
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {mode && (
        <ReviewDialog
          mode={mode}
          targets={correctionTargets}
          busy={busy}
          onClose={() => setMode(null)}
          onSave={(extras, factId) => act(mode, extras, factId)}
        />
      )}
    </>
  );
}

export function reviewLabel(action: string) {
  return (
    (
      {
        accepted: "Confirmed",
        corrected: "Corrected",
        dismissed: "Dismissed",
        left_open: "Acknowledged, unresolved",
        needs_rereview: "Needs re-review",
      } as Record<string, string>
    )[action] ?? action
  );
}
