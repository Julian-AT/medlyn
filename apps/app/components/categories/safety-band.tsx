"use client";

import { ShieldAlertIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SourceChips } from "@/components/sources/source-chips";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent, CardDescription } from "@/components/ui/card";
import { groupEvidence } from "@/lib/group-evidence";
import type { PatientRow } from "./patient-data";

export function SafetyBand({ rows }: { rows: PatientRow[] }) {
  const grouped = groupEvidence(
    rows,
    (row) => row.claim,
    (row) => row.fact,
  );
  if (!rows.length) return null;
  return (
    <Alert
      variant="destructive"
      className="rounded-2xl border-0 bg-destructive/5 px-5 py-4 dark:bg-destructive/10"
    >
      <HugeiconsIcon icon={ShieldAlertIcon} strokeWidth={2} aria-hidden="true" />
      <AlertTitle className="font-semibold">Safety information</AlertTitle>
      <AlertDescription className="gap-3">
        {grouped.map(({ item: { claim }, sources }) => (
          <CardContent
            key={claim.id}
            data-claim-id={claim.id}
            className="flex flex-wrap items-center gap-2 px-0"
          >
            <CardDescription className="text-foreground">{claim.text}</CardDescription>
            <SourceChips
              sources={sources.map(({ fact }) => ({
                segmentId: fact.segmentId,
                date: fact.docDate,
              }))}
            />
          </CardContent>
        ))}
      </AlertDescription>
    </Alert>
  );
}
