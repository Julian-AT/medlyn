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
import { LetterReferences } from "./letter-references";
import { LetterSentence } from "./letter-sentence";

export function LetterPanel({
  sessionId,
  lensKey,
  reviewVersion,
  onSource,
  ready = true,
}: {
  sessionId: string;
  lensKey: string | null;
  reviewVersion: number;
  onSource?: (id: string) => void;
  ready?: boolean;
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
    <Card id="gp-letter" className="rounded-none bg-transparent shadow-none ring-0">
      <CardHeader>
        <CardDescription>GP correspondence</CardDescription>
        <CardTitle>Follow-up letter</CardTitle>
        {letter && (
          <CardAction>
            <Button
              className="h-9 rounded-control"
              variant="outline"
              size="sm"
              disabled={stale || busy}
              onClick={() => window.print()}
            >
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
              <Button
                className="h-9 rounded-control"
                variant="outline"
                size="sm"
                onClick={draft.refresh}
                disabled={busy}
              >
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
            {!ready && (
              <CardDescription>Complete a situation to draft from its evidence.</CardDescription>
            )}
            <Button
              className="h-9 rounded-control"
              onClick={draft.generate}
              disabled={busy || !sessionId || !ready}
            >
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
                <Card
                  key={section.id}
                  size="sm"
                  className="rounded-xl border border-gray-alpha-150 shadow-none ring-0"
                >
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
            <LetterReferences citations={citations} asOf={letter.asOf} />
          </>
        )}
      </CardContent>
      <CardFooter>
        <CardDescription>Clinician review required before sending.</CardDescription>
      </CardFooter>
    </Card>
  );
}
