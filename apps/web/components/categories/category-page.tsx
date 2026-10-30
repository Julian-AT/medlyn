import { formatDate } from "@medlyn/engine/dates";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CategoryAccentKey } from "./category-accent";
import { categories } from "./category-config";
import { CategoryEmpty } from "./category-empty";
import { LabTrends, MedicationView } from "./clinical-views";
import { FactTable } from "./fact-table";
import { diagnosisGroups, GroupedClinicalList } from "./grouped-clinical-list";
import { ImagingFindings } from "./imaging-findings";
import { ImagingStudies } from "./imaging-studies";
import { OncologySummary } from "./oncology-summary";
import { PageHeading } from "./page-heading";
import { PageShell } from "./page-shell.tsx";
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
    <PageShell>
      <PageHeading
        category={category as CategoryAccentKey}
        title={config.title}
        description={config.description}
        action={
          <Button className="rounded-full" asChild>
            <Link href="/situations">Open a situation</Link>
          </Button>
        }
      />
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
          {category === "labs" && <LabTrends data={data} rows={rows} />}
          {category === "oncology" && rows.length > 0 && <OncologySummary rows={rows} />}
          {rows.length && category === "imaging" ? (
            <ImagingStudies data={data} rows={rows} />
          ) : rows.length && ["diagnoses", "procedures", "allergies", "labs"].includes(category) ? (
            <GroupedClinicalList
              groups={
                category === "diagnoses"
                  ? diagnosisGroups(rows)
                  : [{ title: category === "labs" ? "Measurements & history" : config.title, rows }]
              }
            />
          ) : rows.length ? (
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
    </PageShell>
  );
}
