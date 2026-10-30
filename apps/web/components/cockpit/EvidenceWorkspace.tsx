"use client";
import { FileText, ListChecks, NotebookPen } from "lucide-react";
import type { useLens } from "@/hooks/use-lens";
import type { useReviews } from "@/hooks/use-reviews";
import { AskMedlynDock } from "@/components/dock/AskMedlynDock";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvidencePanel } from "./EvidencePanel";
import { LetterPanel } from "./LetterPanel";
import { QuestionsPanel } from "./QuestionsPanel";

type Props = {
  lens: ReturnType<typeof useLens>;
  reviews: ReturnType<typeof useReviews>;
  tab: string;
  onTab: (value: string) => void;
  segmentId: string | null;
  findingId: string | null;
  onSource: (id: string) => void;
  onCompare: (id: string) => void;
};
export function EvidenceWorkspace({
  lens,
  reviews,
  tab,
  onTab,
  segmentId,
  findingId,
  onSource,
  onCompare,
}: Props) {
  const { screen } = reviews;
  return (
    <aside
      className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4 xl:self-start"
      aria-label="Evidence and investigation"
    >
      <Card className="gap-0 py-0">
        <Tabs value={tab} onValueChange={onTab}>
          <CardHeader className="p-3 print:hidden">
            <TabsList className="w-full">
              <TabsTrigger value="evidence">
                <FileText />
                Evidence
              </TabsTrigger>
              <TabsTrigger value="questions">
                <ListChecks />
                Open questions
                <Badge variant="secondary">{screen?.openQuestions.length ?? 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="letter">
                <NotebookPen />
                Letter
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <ScrollArea className="h-[420px] rounded-b-xl print:h-auto">
            <TabsContent value="evidence" className="mt-0">
              <EvidencePanel
                segmentId={segmentId}
                finding={screen?.findings.find((item) => item.id === findingId) ?? null}
                screen={screen}
                onSource={onSource}
                onReview={reviews.onReview}
              />
            </TabsContent>
            <TabsContent value="questions" className="mt-0">
              <QuestionsPanel
                screen={screen}
                dismissed={reviews.dismissed}
                entries={reviews.entries}
                onCompare={onCompare}
                onReview={reviews.onReview}
                loading={lens.loading}
              />
            </TabsContent>
            <TabsContent value="letter" forceMount hidden={tab !== "letter"} className="mt-0">
              <LetterPanel
                sessionId={lens.sessionId}
                lensKey={screen?.lensKey ?? null}
                reviewVersion={reviews.entries.length}
                onSource={onSource}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </Card>
      {reviews.error && (
        <Alert className="print:hidden">
          <AlertDescription>{reviews.error}</AlertDescription>
        </Alert>
      )}
      <Card className="gap-0 overflow-hidden py-0 print:hidden">
        <CardContent className="px-0">
          <AskMedlynDock lensKey={screen?.lensKey ?? null} sessionId={lens.sessionId} />
        </CardContent>
      </Card>
    </aside>
  );
}
