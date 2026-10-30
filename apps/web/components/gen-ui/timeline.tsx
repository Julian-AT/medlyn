"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { groupEvidence } from "@/lib/group-evidence";
import { ClaimLine } from "./claim-line";
import { displayDates } from "./display-dates";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function Timeline(props: ToolProps<UiToolOutputs["show_timeline"]>) {
  const { output } = props;
  const facts = usePatientFacts();
  const groups = groupEvidence(
    output?.events ?? [],
    (event) => event.line,
    (event) => facts.get(event.factId),
  );
  return (
    <ToolFrame
      {...props}
      title="Timeline"
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
      action={
        output && (
          <Badge variant="secondary" className="font-mono">
            {groups.length} entries
          </Badge>
        )
      }
    >
      {output?.events.length === 0 ? (
        <CardDescription>No events to display in this view.</CardDescription>
      ) : null}
      {groups.map(({ item: event, sources }) => (
        <CardContent
          key={event.factId}
          className="relative flex flex-col gap-3 border-l border-primary/25 py-2 pl-5 pr-0"
        >
          <Badge
            aria-hidden="true"
            className="absolute -left-1 top-3 size-2 rounded-full border-0 bg-primary p-0"
          />
          <CardContent className="flex flex-wrap items-center gap-2 px-0">
            <CardDescription className="font-mono text-xs font-medium tabular-nums">
              {displayDates(event.date)}
            </CardDescription>
            <Badge variant="outline" className="text-xs font-normal">
              {event.kind.replaceAll("_", " ")}
            </Badge>
          </CardContent>
          <ClaimLine
            {...event}
            sources={sources.map((entry) => ({
              segmentId: entry.segmentId,
              quote: entry.quote,
              date: facts.get(entry.factId)?.docDate,
            }))}
          />
        </CardContent>
      ))}
    </ToolFrame>
  );
}
