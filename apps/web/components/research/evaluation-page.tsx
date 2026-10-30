"use client";
import type { EvaluationReport } from "@/app/api/research/evaluation/evaluation-report";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResearchReport } from "./hooks/use-research-report";
import { MetricCards } from "./metric-cards";
import { RegressionTable } from "./regression-table";
import { count, milliseconds } from "./report-values";
import { ResearchNotice, ResearchState } from "./research-state";
import { RetrievalChart } from "./retrieval-chart";
import { VerifierComparison } from "./verifier-comparison";
export function EvaluationPage() {
  const { data, error, retry } = useResearchReport<EvaluationReport>("evaluation");
  const times =
    data?.regression.cases.flatMap((row) => (row.latencyMs === null ? [] : [row.latencyMs])) ?? [];
  return (
    <PageShell>
      <PageHeading
        title="Evaluation"
        description="Saved regression, synthetic pipeline, retrieval and verifier reports. Results remain separate by suite."
      />
      <ResearchNotice />
      {error || !data || !data.available ? (
        <ResearchState error={error} empty={data?.available === false} retry={retry} />
      ) : (
        <>
          <MetricCards
            items={[
              {
                label: "Real regression",
                value: data.regression.available
                  ? `${data.regression.cases.filter((row) => row.pass).length}/${data.regression.cases.length}`
                  : "Unmeasured",
                detail: `${data.regression.mode || "No"} run · automated checks`,
              },
              {
                label: "Slowest regression capture",
                value: milliseconds(times.length ? Math.max(...times) : null),
                detail: "Recorded wall time; not a fresh benchmark",
              },
              {
                label: "Synthetic challenges measured",
                value: count(data.synthetic.totals.measured),
                detail: `${count(data.synthetic.totals.skipped)} skipped · ${count(data.synthetic.totals.passed)} passed`,
              },
              {
                label: "Synthetic questions correct",
                value: data.synthetic.available
                  ? `${count(data.synthetic.totals.correct)}/${count(data.synthetic.totals.questions)}`
                  : "Unmeasured",
                detail: "Measured challenge questions only",
              },
            ]}
          />
          <RegressionTable regression={data.regression} />
          <RetrievalChart retrieval={data.retrieval} />
          <VerifierComparison verifier={data.verifier} />
          <Card className="rounded-2xl border p-4 shadow-none ring-0">
            <CardHeader className="p-0">
              <CardTitle>Real blind held-out</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CardDescription>{data.heldout}</CardDescription>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
