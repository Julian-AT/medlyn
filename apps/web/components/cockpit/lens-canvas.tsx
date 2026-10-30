"use client";

import { ShieldAlertIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Annotation, Screen } from "@medlyn/engine/contracts";
import { LayoutGroup } from "motion/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { LensState } from "@/lib/lens-state";
import { FactCard } from "./fact-card";
import type { ReviewHandler } from "./review-controls";

type Props = {
  screen: Screen | null;
  state: LensState;
  loading: boolean;
  annotations: Annotation[];
  onSource: (id: string) => void;
  onFinding: (id: string) => void;
  onRetry: () => void;
  onReview: ReviewHandler;
};
export function LensCanvas({
  screen,
  state,
  loading,
  annotations,
  onSource,
  onFinding,
  onRetry,
  onReview,
}: Props) {
  const cards = screen?.sections.flatMap((section) => section.cards) ?? [];
  const critical = cards.filter((card) => card.critical || screen?.critical.includes(card.id));
  const props = {
    onSource,
    onFinding,
    onRetry,
    onReview,
    activeFindingIds: screen?.findings.map((finding) => finding.id) ?? [],
  };
  return (
    <Card
      role="region"
      aria-label="Clinical lens"
      aria-busy={loading}
      data-lens-state={loading ? "loading" : "done"}
      className="min-w-0 gap-4 rounded-none bg-transparent py-0 shadow-none ring-0 print:hidden"
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Lens interrupted</AlertTitle>
          <AlertDescription>
            {state.error}
            <Button className="rounded-full" size="sm" variant="outline" onClick={onRetry}>
              Retry lens
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <LayoutGroup id="clinical-lens">
        {critical.length > 0 && (
          <>
            <Alert
              variant="destructive"
              className="rounded-2xl border-0 bg-destructive/5 px-5 py-4 dark:bg-destructive/10"
            >
              <HugeiconsIcon icon={ShieldAlertIcon} strokeWidth={2} aria-hidden="true" />
              <AlertTitle>Critical for this task</AlertTitle>
              <AlertDescription>
                Review the safety-critical facts and their attached sources.
              </AlertDescription>
            </Alert>
            <CardContent className="grid gap-3 px-0 md:grid-cols-2">
              {critical.map((card) => (
                <FactCard key={card.needId} card={card} {...props} />
              ))}
            </CardContent>
          </>
        )}
        {!screen && (
          <Card className="rounded-2xl border border-gray-alpha-150 bg-card shadow-xs ring-0">
            <CardHeader>
              <CardTitle>Preparing your clinical lens</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-36 w-full" />
            </CardContent>
          </Card>
        )}
        {screen?.sections.map((section) => {
          const visible = section.cards.filter(
            (card) => !card.critical && !screen.critical.includes(card.id),
          );
          const pending = state.pending.includes(section.id);
          if (!visible.length && !pending) return null;
          return (
            <Card
              key={section.id}
              className="gap-4 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0"
            >
              <CardHeader className="flex flex-row items-center justify-between px-0">
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                {pending && <Badge variant="outline">Checking sources</Badge>}
              </CardHeader>
              <CardContent
                className={
                  visible.length === 1 ? "grid gap-3 px-0" : "grid gap-3 px-0 md:grid-cols-2"
                }
              >
                {visible.map((card) => (
                  <FactCard key={card.needId} card={card} {...props} />
                ))}
                {pending &&
                  !visible.length &&
                  [0, 1].map((key) => (
                    <Card
                      size="sm"
                      key={key}
                      className="rounded-2xl border border-gray-alpha-150 bg-card shadow-xs ring-0"
                    >
                      <CardHeader>
                        <Skeleton className="h-4 w-2/3" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </LayoutGroup>
      {annotations.length > 0 && (
        <Alert>
          <AlertTitle>Clinician notes — not from the source documents</AlertTitle>
          <AlertDescription>
            {annotations.map((note) => (
              <p key={note.id}>
                {note.text} · {note.author}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
      <Separator />
    </Card>
  );
}
