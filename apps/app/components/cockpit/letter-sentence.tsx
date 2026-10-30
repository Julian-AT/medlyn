"use client";

import { Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { LetterClaim } from "@medlyn/engine/contracts";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showClaim } from "@/lib/lens-state";
import { SourceChip } from "./source-chip";

type Props = {
  claim: LetterClaim;
  citations: string[];
  onSource?: (id: string) => void;
  onSave: (id: string, text: string) => Promise<boolean>;
  busy: boolean;
  hideSources?: boolean;
};
export function LetterSentence({ claim, citations, onSource, onSave, busy, hideSources }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(claim.text);
  if (!showClaim(claim)) return null;
  return (
    <Card size="sm" className="rounded-none bg-transparent shadow-none ring-0">
      <CardContent>
        {editing ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (await onSave(claim.id, text)) setEditing(false);
            }}
          >
            <Label htmlFor={`edit-${claim.id}`}>Edit sentence</Label>
            <Textarea
              className="rounded-xl border-0 bg-gray-alpha-100 shadow-none"
              id={`edit-${claim.id}`}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <Button
              className="rounded-full"
              size="sm"
              disabled={busy || !text.trim()}
              type="submit"
            >
              Check & save
            </Button>
            <Button
              className="rounded-full"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              type="button"
            >
              Cancel
            </Button>
          </form>
        ) : (
          <p className="text-sm leading-relaxed">
            {claim.text}
            <sup>{claim.segmentIds.map((id) => `[${citations.indexOf(id) + 1}]`).join("")}</sup>
          </p>
        )}
        {claim.flag && (
          <Alert className="mt-2 border-warning/40">
            <AlertTitle>{claim.flag.reason.replaceAll("_", " ")}</AlertTitle>
            <AlertDescription>
              {claim.flag.proposedText && `Proposed edit: ${claim.flag.proposedText}`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex-wrap gap-1 border-0 bg-transparent py-0 print:hidden">
        {!hideSources &&
          claim.segmentIds.map((id) => (
            <SourceChip
              key={id}
              segmentId={id}
              index={citations.indexOf(id) + 1}
              onOpen={onSource}
            />
          ))}
        {claim.kind !== "boilerplate" && (
          <Button
            className="rounded-full"
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(claim.text);
              setEditing(true);
            }}
          >
            <HugeiconsIcon
              icon={Edit02Icon}
              strokeWidth={2}
              aria-hidden="true"
              data-icon="inline-start"
            />
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
