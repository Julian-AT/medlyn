import { medicationUiLists } from "@medlyn/engine/agent/ui-tools";
import type { Metadata } from "next";
import { MedicationSourceLists } from "@/components/categories/medication-source-lists";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { patientData } from "@/components/categories/patient-data";

export const metadata: Metadata = { title: "Medications · Medlyn" };

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await patientData();
  const rows = data.rows.filter(({ fact }) => fact.kind === "medication");
  const facts = rows.map(({ fact }) => fact);
  const output = medicationUiLists(
    facts,
    rows.map(({ fact, claim }) => ({
      factId: fact.id,
      segmentId: fact.segmentId,
      documentId: fact.documentId,
      quote: fact.quote,
      line: claim,
    })),
    data.window.asOf,
    "all",
  );
  return (
    <PageShell>
      <PageHeading
        category="medications"
        title="Medications"
        description="Discharge medication lists as documented"
      />
      <MedicationSourceLists output={output} facts={facts} />
    </PageShell>
  );
}
