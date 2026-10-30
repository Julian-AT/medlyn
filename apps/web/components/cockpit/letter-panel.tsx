"use client";

import { FileEditIcon, PrinterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDate } from "@medlyn/engine/dates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { useLetter } from "@/hooks/use-letter";
import { LetterSentence } from "./letter-sentence";

export function LetterPanel({
  sessionId,
  lensKey,
  reviewVersion,
  onSource,
}: {
  sessionId: string;
  lensKey: string | null;
  reviewVersion: number;
  onSource: (id: string) => void;
}) {
  const draft = useLetter(sessionId, lensKey, reviewVersion);
  const { letter, busy, error, stale } = draft;
  const citations = [
    ...new Set(
      letter?.sections.flatMap((section) => section.claims.flatMap((claim) => claim.segmentIds)) ??
        [],
    ),
  ];
  return (
    <Card id="gp-letter" className="bg-transparent ring-0">
      <CardHeader>
        <CardDescription>GP correspondence</CardDescription>
        <CardTitle>Follow-up letter</CardTitle>
        {letter && (
          <CardAction>
            <Button variant="outline" size="sm" disabled={stale} onClick={() => window.print()}>
              <HugeiconsIcon
                icon={PrinterIcon}
                strokeWidth={2}
                aria-hidden="true"
                data-icon="inline-start"
              />
              Print
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {stale && (
          <Alert>
            <AlertTitle>Review layer changed</AlertTitle>
            <AlertDescription>
              Refresh to see affected sentences and proposed edits.
              <Button variant="outline" size="sm" onClick={draft.refresh} disabled={busy}>
                Refresh draft
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!letter ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={FileEditIcon} strokeWidth={2} aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>A source-linked draft for the GP</EmptyTitle>
              <EmptyDescription>
                Recommendations, completion evidence and clarification requests. Each factual
                sentence keeps its citations.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={draft.generate} disabled={busy || !lensKey}>
              {busy ? "Checking sources & drafting…" : "Generate GP letter"}
            </Button>
          </Empty>
        ) : (
          <>
            <CardDescription className="font-mono text-xs">
              As of {formatDate(letter.asOf)} · Draft for clinician review
            </CardDescription>
            {letter.sections
              .filter((section) => section.id !== "clinician_notes")
              .map((section) => (
                <Card key={section.id} size="sm">
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    {section.claims.map((claim) => (
                      <LetterSentence
                        key={claim.id}
                        claim={claim}
                        citations={citations}
                        onSource={onSource}
                        onSave={draft.save}
                        busy={busy}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            <Alert>
              <AlertTitle>Clinician notes — not from the source documents</AlertTitle>
              <AlertDescription>
                {letter.annotations.length ? (
                  letter.annotations.map((note) => (
                    <p key={note.id}>
                      {note.text} · {note.author}
                    </p>
                  ))
                ) : (
                  <p>No clinician annotations.</p>
                )}
                {letter.sections
                  .filter((section) => section.id === "clinician_notes")
                  .flatMap((section) => section.claims)
                  .map((claim) => (
                    <p key={claim.id}>{claim.text}</p>
                  ))}
              </AlertDescription>
            </Alert>
            <Separator />
            <CardDescription>Source references</CardDescription>
            {citations.map((id, index) => (
              <CardDescription key={id} className="font-mono text-xs">
                [{index + 1}] {id}
              </CardDescription>
            ))}
          </>
        )}
      </CardContent>
      <CardFooter>
        <CardDescription>Clinician review required before sending.</CardDescription>
      </CardFooter>
    </Card>
  );
}
