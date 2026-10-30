"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ClaimLine } from "./claim-line";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function PatientSummary(props: ToolProps<UiToolOutputs["show_patient_summary"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      title="Patient summary"
      description={output ? `As of ${output.asOf}` : undefined}
    >
      {output?.demographics.map((item) => (
        <ClaimLine key={item.factId} {...item} />
      ))}
      {output ? (
        <CardDescription className="text-xs tabular-nums">
          {output.documentCount} eligible documents
        </CardDescription>
      ) : null}
      <CardContent className="flex flex-wrap gap-1.5 px-0">
        {output?.counts
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <Badge key={entry.kind} variant="outline" className="font-normal tabular-nums">
              {entry.kind.replaceAll("_", " ")} · {entry.count}
            </Badge>
          ))}
      </CardContent>
      {output?.criticalFacts.length ? (
        <CardContent className="space-y-3 border-t px-0 pt-3">
          <CardTitle className="text-xs">Critical facts</CardTitle>
          {output.criticalFacts.map((item) => (
            <ClaimLine key={item.factId} {...item} />
          ))}
        </CardContent>
      ) : null}
    </ToolFrame>
  );
}
