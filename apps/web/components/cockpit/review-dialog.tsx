"use client";

import { DismissReason, type ReviewRequest } from "@medlyn/engine/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  mode: "correct" | "dismiss";
  targets: { id: string; label: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    extras: Pick<ReviewRequest, "proposedText" | "reason">,
    factId?: string,
  ) => Promise<void>;
};
export function ReviewDialog({ mode, targets, busy, onClose, onSave }: Props) {
  const [text, setText] = useState("");
  const [reason, setReason] = useState<ReviewRequest["reason"]>("different_context");
  const [factId, setFactId] = useState(targets[0]?.id);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "correct" ? "Propose a correction" : "Dismiss this item"}
          </DialogTitle>
          <DialogDescription>
            {mode === "correct"
              ? "Corrections are checked against the original passage. Unsupported additions become clinician notes."
              : "The original passages remain available. This reason is recorded in the review ledger."}
          </DialogDescription>
        </DialogHeader>
        {mode === "correct" ? (
          <>
            {targets.length > 1 && (
              <>
                <Label htmlFor="review-fact">Fact to correct</Label>
                <Select value={factId} onValueChange={setFactId}>
                  <SelectTrigger id="review-fact">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {targets.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            )}
            <Label htmlFor="review-text">Proposed correction</Label>
            <Textarea
              id="review-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </>
        ) : (
          <>
            <Label htmlFor="review-reason">Reason for dismissal</Label>
            <Select value={reason} onValueChange={(value) => setReason(DismissReason.parse(value))}>
              <SelectTrigger id="review-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DismissReason.options.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || (mode === "correct" && !text.trim())}
            onClick={() => onSave(mode === "correct" ? { proposedText: text } : { reason }, factId)}
          >
            {busy ? "Saving…" : "Save review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
