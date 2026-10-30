"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { groupEvidence } from "@/lib/group-evidence";
import { ClaimLine } from "./claim-line";
import { displayDates } from "./display-dates";
import { useToolPreview } from "./hooks/use-tool-preview";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function Timeline(props: ToolProps<UiToolOutputs["show_timeline"]>) {
  const { output } = props;
  const facts = usePatientFacts();
  const groups = groupEvidence(
    output?.events ?? [],
    (event) => event.line,
    (event) => facts.get(event.factId),
  );
  const preview = useToolPreview(groups.length, props.expanded, 5);
  return (
    <ToolFrame
      {...props}
      title="Timeline"
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
      action={preview.toggle}
    >
      {output?.events.length === 0 ? (
        <ToolEmpty
          title="No events to display"
          description="Try a different event type or open a situation. This view does not establish absence."
        />
      ) : null}
      {groups.slice(0, preview.limit).map(({ item: event, sources }) => (
        <CardContent
          key={event.factId}
          className="flex min-h-10 flex-col gap-3 border-b border-border p-0 pb-4"
        >
          <CardContent className="flex flex-wrap items-center gap-2 p-0">
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
