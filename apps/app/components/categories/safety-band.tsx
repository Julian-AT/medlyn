"use client";

import { ShieldAlertIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SourceChips } from "@/components/sources/source-chips";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent } from "@/components/ui/card";
import { groupEvidence } from "@/lib/group-evidence";
import { ClaimText } from "./claim-text";
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
      className="min-w-0 rounded-2xl border-0 bg-destructive/5 px-5 py-4 has-[>svg]:grid-cols-[auto_minmax(0,1fr)] dark:bg-destructive/10"
    >
      <HugeiconsIcon icon={ShieldAlertIcon} strokeWidth={2} aria-hidden="true" />
      <AlertTitle className="font-semibold">Safety information</AlertTitle>
      <AlertDescription className="flex min-w-0 flex-col gap-4 pt-2">
        {grouped.map(({ item: { claim }, sources }) => (
          <CardContent
            key={claim.id}
            data-claim-id={claim.id}
            className="flex min-w-0 flex-col items-start gap-2 px-0"
          >
            <ClaimText claim={claim} />
            <SourceChips
              sources={sources.map(({ fact }) => ({
                segmentId: fact.segmentId,
                documentId: fact.documentId,
                date: fact.docDate,
              }))}
            />
          </CardContent>
        ))}
      </AlertDescription>
    </Alert>
  );
}
