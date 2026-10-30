"use client";

import type { UIMessage } from "ai";
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
  QueueList,
} from "@/components/ai-elements/queue";
import { displayDates } from "@/components/gen-ui/display-dates";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { InvestigationQueueState } from "./hooks/use-investigation-queue";
import { type InvestigationQuestion, investigationQuestions } from "./investigation-questions";
import type { InvestigationStatus } from "./investigation-runner";

const LABELS: Record<InvestigationStatus, string> = {
  pending: "Queued",
  active: "Checking…",
  checked: "Answer ready",
  failed: "Couldn't check",
  stopped: "Stopped",
};

export function InvestigationQueue({
  message,
  state,
  disabled,
  onStart,
  onStop,
}: {
  message: UIMessage;
  state: InvestigationQueueState | null;
  disabled: boolean;
  onStart: (id: string, questions: InvestigationQuestion[]) => void;
  onStop: () => void;
}) {
  const questions = investigationQuestions(message);
  if (questions.length < 2) return null;
  const current = state?.sourceId === message.id ? state : null;
  const items =
    current?.items ?? questions.map((question) => ({ ...question, status: "pending" as const }));
  const remaining = items.filter((item) => item.status !== "checked");
  return (
    <Collapsible asChild>
      <Queue aria-label="Follow-up investigations">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 px-0">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto min-h-8 flex-col items-start gap-0 px-0 text-left"
            >
              <CardTitle className="text-sm font-medium">Follow-up investigations</CardTitle>
              <CardDescription className="text-xs font-normal">
                {items.length - remaining.length} of {items.length} answers ready · Show questions
              </CardDescription>
            </Button>
          </CollapsibleTrigger>
          {current?.running ? (
            <Button size="sm" variant="outline" onClick={onStop}>
              Stop checks
            </Button>
          ) : remaining.length ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => onStart(message.id, remaining)}
            >
              {current ? "Continue checks" : `Check all ${questions.length} questions`}
            </Button>
          ) : (
            <CardDescription className="text-xs">Answers ready</CardDescription>
          )}
        </CardContent>
        <CollapsibleContent>
          <QueueList>
            {items.map((item) => (
              <QueueItem key={item.id}>
                <QueueItemIndicator
                  completed={item.status === "checked"}
                  active={item.status === "active"}
                />
                <QueueItemContent>{displayDates(item.title)}</QueueItemContent>
                <CardDescription className="shrink-0 text-[11px]/5" aria-live="polite">
                  {LABELS[item.status]}
                </CardDescription>
              </QueueItem>
            ))}
          </QueueList>
        </CollapsibleContent>
        <CardDescription className="text-xs/5">
          Each question gets a separate source-checked answer below. An answer does not mean the
          recommended care was completed.
        </CardDescription>
      </Queue>
    </Collapsible>
  );
}
