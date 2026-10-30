"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { FindingsCompare } from "./findings-compare";
import { useToolPreview } from "./hooks/use-tool-preview";
import { LensDetailCard } from "./lens-detail-card";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

type Props = ToolProps<UiToolOutputs["open_lens"], { text?: string; chipId?: string | null }>;

export function LensCards(props: Props) {
  const { output, expanded } = props;
  const sections = output?.sections ?? [];
  const cards = sections.flatMap((section) => section.cards.map((card) => ({ card, section })));
  cards.sort((a, b) => Number(b.card.critical) - Number(a.card.critical));
  const preview = useToolPreview(cards.length, expanded);
  return (
    <ToolFrame
      {...props}
      artifact={props.toolCallId ? { kind: "lens", id: props.toolCallId } : undefined}
      title="Situation lens"
      action={preview.toggle}
      description={output?.situation.task}
    >
      <CardContent className="flex flex-wrap gap-1.5 p-0" aria-label="Situation sections">
        {sections.map((section) => (
          <Badge
            variant="secondary"
            key={section.id}
            className="rounded-control text-xs font-normal"
          >
            {section.title}
          </Badge>
        ))}
      </CardContent>
      {output && cards.length === 0 ? (
        <ToolEmpty
          title="No situation cards to display"
          description="Try a more specific role and task. This view does not establish absence."
        />
      ) : null}
      {cards.slice(0, preview.limit).map(({ card, section }) => (
        <LensDetailCard key={card.id} card={card} sectionTitle={section.title} compact={false} />
      ))}
      {expanded && output?.openQuestions.length ? (
        <CardContent className="flex flex-col gap-2 p-0">
          <CardTitle className="text-xs">Open questions</CardTitle>
          <CardContent role="list" className="space-y-2 p-0">
            {output.openQuestions.map((question) => (
              <CardDescription
                role="listitem"
                key={question.id}
                className="relative pl-3 text-xs/relaxed before:absolute before:left-0 before:content-['•']"
              >
                {displayDates(question.title)}
              </CardDescription>
            ))}
          </CardContent>
        </CardContent>
      ) : null}
      {expanded && output?.findings.length ? (
        <FindingsCompare
          state="output-available"
          expanded
          output={{ asOf: output.situation.asOf, findings: output.findings }}
        />
      ) : null}
    </ToolFrame>
  );
}
