"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ClaimList } from "./claim-list";
import { displayDates } from "./display-dates";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function PatientSummary(props: ToolProps<UiToolOutputs["show_patient_summary"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      title="Patient summary"
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
    >
      {output && !output.demographics.length && !output.criticalFacts.length ? (
        <ToolEmpty
          title="No supported summary facts to display"
          description="Open the source documents to investigate. This summary does not establish absence."
        />
      ) : null}
      <ClaimList items={output?.demographics ?? []} />
      {output ? (
        <CardDescription className="text-xs tabular-nums">
          {output.documentCount} eligible documents
        </CardDescription>
      ) : null}
      <CardContent className="flex flex-wrap gap-1.5 p-0">
        {output?.counts
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <Badge key={entry.kind} variant="outline" className="font-normal tabular-nums">
              {entry.kind.replaceAll("_", " ")} · {entry.count}
            </Badge>
          ))}
      </CardContent>
      {output?.criticalFacts.length ? (
        <CardContent className="flex flex-col gap-3 p-0 pt-3">
          <CardTitle className="text-xs">Critical facts</CardTitle>
          <ClaimList items={output.criticalFacts} />
        </CardContent>
      ) : null}
    </ToolFrame>
  );
}
