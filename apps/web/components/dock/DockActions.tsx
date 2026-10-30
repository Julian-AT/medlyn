"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { FileAddIcon, PauseCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import type { Answer } from "./hooks/use-dock-runtime.ts";

export function DockActions({
  answer,
  lensKey,
  sessionId,
  onLeaveOpen,
}: {
  answer: Answer | null;
  lensKey: string | null;
  sessionId: string;
  onLeaveOpen: () => void;
}) {
  if (!answer) return null;
  return (
    <CardContent className="flex flex-wrap gap-2">
      {answer.nextAction === "Add to the GP letter" && answer.claims.length ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("medlyn:add-to-letter", {
                detail: {
                  claimIds: answer.claims.map((claim) => claim.id),
                  claims: answer.claims,
                  lensKey,
                  sessionId,
                },
              }),
            )
          }
        >
          <HugeiconsIcon
            icon={FileAddIcon}
            strokeWidth={2}
            aria-hidden="true"
            data-icon="inline-start"
          />
          Add to the GP letter
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={onLeaveOpen}>
          <HugeiconsIcon
            icon={PauseCircleIcon}
            strokeWidth={2}
            aria-hidden="true"
            data-icon="inline-start"
          />
          Leave open
        </Button>
      )}
    </CardContent>
  );
}
