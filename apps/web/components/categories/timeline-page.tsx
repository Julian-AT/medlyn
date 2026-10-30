import { formatDate } from "@medlyn/engine/dates";
import { Timeline } from "@/components/gen-ui/timeline";
import { CategoryEmpty } from "./category-empty";
import { datedRows } from "./group-facts";
import { PageHeading } from "./page-heading";
import { PageShell } from "./page-shell.tsx";
import { patientData } from "./patient-data";
import { SharedDataView } from "./shared-data-view";
export async function TimelinePage() {
  let data: Awaited<ReturnType<typeof patientData>> | null = null;
  try {
    data = await patientData();
  } catch (error) {
    console.error("Timeline unavailable", error instanceof Error ? error.message : String(error));
  }
  return (
    <PageShell>
      <PageHeading
        category="timeline"
        title="Timeline"
        description="Dated facts in sequence. Planned events retain their stated status."
      />
      {!data ? (
        <CategoryEmpty unavailable />
      ) : data.rows.length ? (
        <SharedDataView>
          <Timeline
            state="output-available"
            output={{
              asOf: data.window.asOf,
              events: datedRows(data.rows).map(({ fact, claim }) => ({
                factId: fact.id,
                segmentId: fact.segmentId,
                documentId: fact.documentId,
                quote: fact.quote,
                line: claim,
                date: formatDate(fact.eventDate ?? fact.docDate, fact.datePrecision),
                kind: fact.kind,
              })),
            }}
          />
        </SharedDataView>
      ) : (
        <CategoryEmpty />
      )}
    </PageShell>
  );
}
