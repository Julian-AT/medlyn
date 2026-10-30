import { formatDate } from "@medlyn/engine/dates";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryEmpty } from "./category-empty";
import { DocumentsTable } from "./documents-table";
import { FactTable } from "./fact-table";
import { OverviewStats } from "./overview-stats.tsx";
import { PageHeading } from "./page-heading";
import { PageShell } from "./page-shell.tsx";
import { patientData } from "./patient-data";
import { SafetyBand } from "./safety-band.tsx";
export async function OverviewPage() {
  let data: Awaited<ReturnType<typeof patientData>> | null = null;
  try {
    data = await patientData();
  } catch (error) {
    console.error(
      "Patient overview unavailable",
      error instanceof Error ? error.message : String(error),
    );
  }
  return (
    <PageShell>
      <PageHeading
        title="Patient overview"
        description={
          data
            ? `Source-linked patient record · Evidence as of ${formatDate(data.window.asOf)}`
            : "A source-linked view of the patient record."
        }
        action={
          <Button asChild>
            <Link href="/situations">Open a situation</Link>
          </Button>
        }
      />
      {!data ? (
        <CategoryEmpty unavailable />
      ) : (
        <>
          <OverviewStats data={data} />
          <SafetyBand rows={data.rows.filter(({ fact }) => fact.kind === "allergy")} />
          <FactTable
            title="Upcoming care"
            description="Plans retain the status stated in their source document."
            rows={data.rows.filter(
              ({ fact }) => fact.kind === "procedure" && fact.temporalStatus === "planned",
            )}
          />
          <DocumentsTable
            title="Recent documents"
            documents={[...data.documents]
              .sort((a, b) => b.docDate.localeCompare(a.docDate))
              .slice(0, 4)
              .map((document) => ({
                ...document,
                segmentId:
                  data.facts.find((fact) => fact.documentId === document.id)?.segmentId ?? null,
              }))}
          />
        </>
      )}
    </PageShell>
  );
}
