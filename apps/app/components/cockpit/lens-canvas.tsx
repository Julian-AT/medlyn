"use client";

import type { Annotation, Screen } from "@medlyn/engine/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { LensState } from "@/lib/lens-state";
import { FactCard } from "./fact-card";
import { LensSkeleton } from "./lens-skeleton";
import type { ReviewHandler } from "./review-controls";

type Props = {
  screen: Screen | null;
  state: LensState;
  loading: boolean;
  annotations: Annotation[];
  onFinding: (id: string) => void;
  onRetry: () => void;
  onReview: ReviewHandler;
};

export function LensCanvas({
  screen,
  state,
  loading,
  annotations,
  onFinding,
  onRetry,
  onReview,
}: Props) {
  const cards = screen?.sections.flatMap((section) => section.cards) ?? [];
  const isCritical = (card: (typeof cards)[number]) =>
    card.critical || screen?.critical.includes(card.id);
  const critical = cards.filter(isCritical);
  const props = {
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
      data-lens-state={
        loading ? "loading" : state.error ? "error" : state.complete ? "done" : "idle"
      }
      className="min-w-0 gap-6 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0 print:hidden"
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Evidence check incomplete</AlertTitle>
          <AlertDescription>
            {state.error}
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry lens
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {critical.length > 0 && (
        <Card className="gap-3 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0">
          <CardHeader className="px-0">
            <CardTitle className="text-sm text-destructive">Critical for this task</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-0">
            {critical.map((card) => (
              <FactCard key={card.needId} card={card} {...props} />
            ))}
          </CardContent>
        </Card>
      )}
      {!screen && loading && <LensSkeleton />}
      {screen?.sections.map((section) => {
        if (loading && state.pending.includes(section.id))
          return <LensSkeleton key={section.id} title={section.title} />;
        const visible = section.cards.filter((card) => !isCritical(card));
        if (!visible.length) return null;
        return (
          <Card
            key={section.id}
            className="gap-3 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0"
          >
            <CardHeader className="px-0">
              <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-0">
              {visible.map((card) => (
                <FactCard key={card.needId} card={card} {...props} />
              ))}
            </CardContent>
          </Card>
        );
      })}
      {!loading && state.complete && !cards.length && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No facts to display</EmptyTitle>
            <EmptyDescription>
              Try a more specific role and task to build another lens.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
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
    </Card>
  );
}
