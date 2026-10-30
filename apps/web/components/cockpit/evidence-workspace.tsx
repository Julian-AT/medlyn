"use client";

import type { Screen } from "@medlyn/engine/contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { useLens } from "@/hooks/use-lens";
import type { useReviews } from "@/hooks/use-reviews";
import { LensCanvas } from "./lens-canvas";
import { LetterPanel } from "./letter-panel";
import { QuestionsPanel } from "./questions-panel";

type Props = {
  lens: ReturnType<typeof useLens>;
  reviews: ReturnType<typeof useReviews>;
  screen: Screen | null;
  tab: string;
  onTab: (value: string) => void;
  onCompare: (id: string) => void;
};

export function EvidenceWorkspace({ lens, reviews, screen, tab, onTab, onCompare }: Props) {
  return (
    <Card className="min-w-0 gap-4 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0">
      <Tabs value={tab} onValueChange={onTab} className="gap-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-0 print:hidden">
          <TabsList variant="line" aria-label="Situation results">
            <TabsTrigger value="facts">Facts</TabsTrigger>
            <TabsTrigger value="questions">
              Open questions
              {screen && <Badge variant="secondary">{screen.openQuestions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="letter">Letter</TabsTrigger>
          </TabsList>
          {reviews.count > 0 && (
            <Button variant="ghost" size="sm" onClick={reviews.reset}>
              Reset review layer
            </Button>
          )}
        </CardHeader>
        <TabsContent value="facts">
          <LensCanvas
            screen={screen}
            state={lens.state}
            loading={lens.loading}
            annotations={reviews.annotations}
            onFinding={onCompare}
            onRetry={lens.retry}
            onReview={reviews.onReview}
          />
        </TabsContent>
        <TabsContent value="questions">
          <QuestionsPanel
            screen={screen}
            dismissed={reviews.dismissed}
            entries={reviews.entries}
            onCompare={onCompare}
            onReview={reviews.onReview}
            loading={lens.loading}
            error={lens.state.error}
          />
        </TabsContent>
        <TabsContent value="letter" forceMount hidden={tab !== "letter"}>
          <LetterPanel
            sessionId={lens.sessionId}
            lensKey={lens.state.complete && !lens.loading ? (screen?.lensKey ?? null) : null}
            ready={lens.state.complete && !lens.loading && screen !== null}
            reviewVersion={reviews.entries.length}
          />
        </TabsContent>
      </Tabs>
      {reviews.error && (
        <Alert className="print:hidden">
          <AlertDescription>{reviews.error}</AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
