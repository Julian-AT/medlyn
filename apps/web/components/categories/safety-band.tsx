"use client";

import { ShieldAlertIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { SourceChip } from "@/components/cockpit/source-chip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent, CardDescription } from "@/components/ui/card";
import { EvidenceSheet } from "./evidence-sheet";
import type { PatientRow } from "./patient-data";

export function SafetyBand({ rows }: { rows: PatientRow[] }) {
  const [source, setSource] = useState<string | null>(null);
  if (!rows.length) return null;
  return (
    <>
      <Alert variant="destructive" className="rounded-2xl">
        <HugeiconsIcon icon={ShieldAlertIcon} strokeWidth={1.75} aria-hidden="true" />
        <AlertTitle className="font-semibold">Safety information</AlertTitle>
        <AlertDescription className="gap-3">
          {rows.map(({ fact, claim }) => (
            <CardContent
              key={claim.id}
              data-claim-id={claim.id}
              className="flex flex-wrap items-center gap-2 px-0"
            >
              <CardDescription className="text-foreground">{claim.text}</CardDescription>
              <SourceChip segmentId={fact.segmentId} onOpen={setSource} />
            </CardContent>
          ))}
        </AlertDescription>
      </Alert>
      <EvidenceSheet segmentId={source} onClose={() => setSource(null)} />
    </>
  );
}
