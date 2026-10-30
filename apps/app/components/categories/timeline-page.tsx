import { CategoryEmpty } from "./category-empty";
import { PageHeading } from "./page-heading";
import { PageShell } from "./page-shell.tsx";
import { patientData } from "./patient-data";
import { PatientTimeline } from "./patient-timeline";
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
        <PatientTimeline rows={data.rows} />
      ) : (
        <CategoryEmpty />
      )}
    </PageShell>
  );
}
