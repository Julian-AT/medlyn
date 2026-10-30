import { formatDate } from "@medlyn/engine/dates";
import { Card, CardContent } from "@/components/ui/card";
import { categories } from "./category-config";
import { CategoryEmpty } from "./category-empty";
import { LabTrends, MedicationView } from "./clinical-views";
import { FactTable } from "./fact-table";
import { ImagingFindings } from "./imaging-findings";
import { PageHeading } from "./page-heading";
import { patientData } from "./patient-data";
export async function CategoryPage({ category }: { category: string }) {
  const config = categories[category];
  let data: Awaited<ReturnType<typeof patientData>> | null = null;
  try {
    data = await patientData();
  } catch (error) {
    console.error("Patient category unavailable", {
      category,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const rows =
    data?.rows.filter(
      (row) =>
        config.kinds.includes(row.fact.kind) &&
        (category !== "oncology" ||
          ["histology", "staging", "receptor"].includes(row.fact.kind) ||
          /carcinoma|ductal|tumou?r|board|oncolog|iort|breast|mamma|quadrant|bi-rads|axill/i.test(
            row.claim.text,
          )),
    ) ?? [];
  return (
    <Card className="mx-auto w-full max-w-6xl gap-8 rounded-none bg-transparent px-4 py-6 shadow-none ring-0 md:px-8">
      <CardContent className="flex flex-col gap-8 px-0">
        <PageHeading title={config.title} description={config.description} />
        {!data ? (
          <CategoryEmpty unavailable />
        ) : category === "medications" ? (
          rows.length ? (
            <MedicationView data={data} rows={rows} />
          ) : (
            <CategoryEmpty />
          )
        ) : (
          <>
            {category === "labs" && <LabTrends data={data} rows={rows} />}{" "}
            {rows.length ? (
              <FactTable
                title={config.title}
                description={`Evidence available as of ${formatDate(data.window.asOf)}`}
                rows={rows}
              />
            ) : (
              <CategoryEmpty />
            )}
            {category === "imaging" && <ImagingFindings window={data.window} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
