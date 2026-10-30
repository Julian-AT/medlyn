"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ClaimLine } from "./claim-line";

export function MedicationChanges({
  changes,
}: {
  changes: UiToolOutputs["show_medications"]["changes"];
}) {
  return (
    <CardContent className="flex flex-col gap-4 border-t px-0 pt-4">
      <CardContent className="flex flex-wrap items-center gap-2 px-0">
        <CardTitle className="text-sm font-semibold">Changes between source lists</CardTitle>
        <Badge variant="secondary">Trend</Badge>
      </CardContent>
      {changes.map((change) => (
        <CardContent
          key={`${change.from.factId}:${change.to.factId}`}
          className="flex flex-col gap-3 rounded-xl border p-4"
        >
          <CardDescription className="font-mono text-xs">
            {change.fromDate} → {change.toDate}
          </CardDescription>
          <ClaimLine {...change.from} />
          <ClaimLine {...change.to} />
        </CardContent>
      ))}
    </CardContent>
  );
}
