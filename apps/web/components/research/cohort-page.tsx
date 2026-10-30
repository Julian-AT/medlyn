"use client";
import type { CohortReport } from "@/app/api/research/cohort/cohort-report";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardContent } from "@/components/ui/card";
import { DistributionChart } from "./distribution-chart";
import { useResearchReport } from "./hooks/use-research-report";
import { MetricCards } from "./metric-cards";
import { count } from "./report-values";
import { ResearchNotice, ResearchState } from "./research-state";
import { SampleBrowser } from "./sample-browser";
export function CohortPage() {
  const { data, error, retry } = useResearchReport<CohortReport>("cohort");
  return (
    <PageShell>
      <PageHeading
        title="Synthetic cohort"
        description="Explore the generated cohort, its patient splits and the committed sample records."
      />
      <ResearchNotice />
      {error || !data || !data.available ? (
        <ResearchState error={error} empty={data?.available === false} retry={retry} />
      ) : (
        <>
          {data.scope === "sample" && (
            <Alert>
              <AlertDescription>
                The full local manifest is unavailable. Counts below describe the committed sample
                only.
              </AlertDescription>
            </Alert>
          )}
          <MetricCards
            items={[
              {
                label: "Generated patients",
                value: count(data.counts.patients ?? null),
                detail: `Generator v${data.version} · ${data.scope === "full" ? "Full local cohort" : "Sample only"}`,
              },
              {
                label: "Documents",
                value: count(data.counts.documents ?? null),
                detail: "Generated documents; not all indexed in the app",
              },
              {
                label: "Fact labels",
                value: count(data.counts.facts ?? null),
                detail: "Code-checked labels from final rendered text",
              },
              {
                label: "Controlled contradictions",
                value: count(data.counts.contradictions ?? null),
                detail: `${count(data.rewrittenPatients)} patients with prose rewrites`,
              },
            ]}
          />
          <CardContent className="grid min-w-0 gap-6 p-0 lg:grid-cols-2">
            <DistributionChart
              title="Patient splits"
              description="Patients and generation families are separated before rewriting."
              data={data.splits}
            />
            <DistributionChart
              title="Controlled mutations"
              description="Mutation instances across the reported cohort."
              data={data.mutations}
            />
          </CardContent>
          <DistributionChart
            title="Clinical scenarios"
            description="Counts derived from generation-family membership."
            data={data.scenarios}
          />
          <SampleBrowser samples={data.samples} />
        </>
      )}
    </PageShell>
  );
}
