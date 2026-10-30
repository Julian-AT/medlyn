"use client";

import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEFAULT_PATIENT_ID } from "@/lib/active-patient";
import { LetterPanel } from "./letter-panel";

export function LetterPage() {
  const { sessionId, reviews } = useWorkspace();
  const { patient } = useActivePatient();
  return (
    <PageShell>
      <PageHeading
        title="GP letter"
        description="Generate a source-linked follow-up letter from the eligible patient record. Review every sentence before sending."
      />
      {patient.id !== DEFAULT_PATIENT_ID ? (
        <Alert>
          <AlertDescription>
            GP letters are available for the demonstration patient. Select Anna Musterfrau to draft
            a letter.
          </AlertDescription>
        </Alert>
      ) : (
        <LetterPanel
          sessionId={sessionId}
          lensKey={reviews.screen?.lensKey ?? null}
          reviewVersion={reviews.entries.length}
          onSource={() => undefined}
        />
      )}
    </PageShell>
  );
}
