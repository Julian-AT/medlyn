import { formatDate } from "@medlyn/engine/dates";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "./category-config";
import { CategoryEmpty } from "./category-empty";
import { FactTable } from "./fact-table";
import { PageHeading } from "./page-heading";
import { patientData } from "./patient-data";
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
    <Card className="gap-8 rounded-none bg-transparent mx-auto w-full max-w-6xl px-4 py-6 shadow-none ring-0 md:px-8">
      <CardContent className="flex flex-col gap-8 px-0">
        <PageHeading
          title="Patient overview"
          description="A source-linked view of Anna Musterfrau’s record."
        />
        {!data ? (
          <CategoryEmpty unavailable />
        ) : (
          <>
            <Card className="rounded-xl border shadow-none ring-0">
              <CardHeader>
                <CardTitle>Anna Musterfrau</CardTitle>
                <CardDescription>
                  {data.documents.length} documents · Evidence as of {formatDate(data.window.asOf)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(categories).map(([key, category]) => (
                  <Button key={key} asChild variant="outline" className="justify-between">
                    <Link href={`/patient/${key}`}>
                      {category.title}
                      <span>
                        {data.rows.filter((row) => category.kinds.includes(row.fact.kind)).length}
                      </span>
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
            <FactTable
              title="Safety and upcoming care"
              rows={data.rows.filter(
                (row) =>
                  row.fact.kind === "allergy" ||
                  (row.fact.kind === "procedure" && row.fact.temporalStatus === "planned"),
              )}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
