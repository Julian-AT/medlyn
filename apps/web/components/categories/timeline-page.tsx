import { Card, CardContent } from "@/components/ui/card";
import { CategoryEmpty } from "./category-empty";
import { FactTable } from "./fact-table";
import { datedRows } from "./group-facts";
import { PageHeading } from "./page-heading";
import { patientData } from "./patient-data";
export async function TimelinePage() {
  let data: Awaited<ReturnType<typeof patientData>> | null = null;
  try {
    data = await patientData();
  } catch (error) {
    console.error("Timeline unavailable", error instanceof Error ? error.message : String(error));
  }
  return (
    <Card className="gap-8 rounded-none bg-transparent mx-auto w-full max-w-6xl px-4 py-6 shadow-none ring-0 md:px-8">
      <CardContent className="flex flex-col gap-8 px-0">
        <PageHeading
          title="Timeline"
          description="Dated facts in sequence. Planned events retain their stated status."
        />
        {!data ? (
          <CategoryEmpty unavailable />
        ) : data.rows.length ? (
          <FactTable title="Clinical record" rows={datedRows(data.rows)} />
        ) : (
          <CategoryEmpty />
        )}
      </CardContent>
    </Card>
  );
}
