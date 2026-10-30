"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimLine } from "./claim-line";
import { ToolFrame, type ToolProps } from "./tool-frame";

type Props = ToolProps<UiToolOutputs["open_lens"], { text?: string; chipId?: string }>;

export function LensCards(props: Props) {
  const { output } = props;
  const sections = output?.sections ?? [];
  const cards = sections.flatMap((section) => section.cards.map((card) => ({ card, section })));
  cards.sort((a, b) => Number(b.card.critical) - Number(a.card.critical));
  const query = new URLSearchParams({ text: props.input?.text || output?.situation.task || "" });
  if (output) query.set("asOf", output.situation.asOf);
  return (
    <ToolFrame {...props} title="Situation lens" description={output?.situation.task}>
      {cards.map(({ card, section }) => (
        <Card
          key={card.id}
          size="sm"
          data-card-id={card.id}
          className={
            card.critical
              ? "rounded-xl border border-destructive/30 shadow-none ring-0"
              : "rounded-xl border shadow-none ring-0"
          }
        >
          <CardHeader>
            <CardDescription className="text-xs">{section.title}</CardDescription>
            <CardTitle className="text-sm font-semibold tracking-tight">{card.title}</CardTitle>
            <CardDescription className="text-xs">{card.why}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CardContent className="flex flex-wrap gap-1.5 px-0">
              {card.critical ? <Badge variant="destructive">Critical</Badge> : null}
              {card.completeness === "partial" ? <Badge variant="outline">Partial</Badge> : null}
              {card.conflict !== "none" ? (
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                  {card.conflict.replaceAll("_", " ")}
                </Badge>
              ) : null}
              {card.review ? <Badge variant="secondary">{card.review.action}</Badge> : null}
            </CardContent>
            {card.availability === "unavailable" ? (
              <CardDescription>Couldn't check</CardDescription>
            ) : (
              card.lines.map((line) => <ClaimLine key={line.id} line={line} />)
            )}
            {card.missing?.length ? (
              <CardDescription className="text-xs">
                Missing: {card.missing.join(", ")}
              </CardDescription>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {output?.openQuestions.length ? (
        <CardContent className="flex flex-col gap-1 border-t px-0 pt-3">
          <CardTitle className="text-xs">Open questions</CardTitle>
          {output.openQuestions.map((question) => (
            <CardDescription key={question.id} className="text-xs">
              {question.title}
            </CardDescription>
          ))}
        </CardContent>
      ) : null}
      <Button asChild variant="outline" size="sm" className="shadow-none">
        <a href={`/situations?${query}`}>Open full screen</a>
      </Button>
    </ToolFrame>
  );
}
