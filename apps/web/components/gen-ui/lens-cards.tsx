"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { ArtifactOpenButton } from "@/components/artifacts/artifact-open-button";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { FindingsCompare } from "./findings-compare";
import { LensDetailCard } from "./lens-detail-card";
import { ToolFrame, type ToolProps } from "./tool-frame";

type Props = ToolProps<UiToolOutputs["open_lens"], { text?: string; chipId?: string }>;

export function LensCards(props: Props) {
  const { output, expanded } = props;
  const sections = output?.sections ?? [];
  const cards = sections.flatMap((section) => section.cards.map((card) => ({ card, section })));
  cards.sort((a, b) => Number(b.card.critical) - Number(a.card.critical));
  return (
    <ToolFrame {...props} title="Situation lens" description={output?.situation.task}>
      <CardContent className="flex flex-wrap gap-1.5 px-0" aria-label="Situation sections">
        {sections.map((section) => (
          <Badge
            variant="secondary"
            key={section.id}
            className="rounded-full text-[11px] font-normal"
          >
            {section.title}
          </Badge>
        ))}
      </CardContent>
      {(expanded ? cards : cards.slice(0, 3)).map(({ card, section }) => (
        <LensDetailCard
          key={card.id}
          card={card}
          sectionTitle={section.title}
          compact={!expanded}
        />
      ))}
      {expanded && output?.openQuestions.length ? (
        <CardContent className="flex flex-col gap-2 px-0">
          <CardTitle className="text-xs">Open questions</CardTitle>
          <CardContent role="list" className="space-y-2 px-0">
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
      {!expanded && output && props.toolCallId && (
        <ArtifactOpenButton artifact={{ kind: "lens", id: props.toolCallId }} />
      )}
    </ToolFrame>
  );
}
