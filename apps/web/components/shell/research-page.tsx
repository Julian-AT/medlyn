import { PageHeading } from "@/components/categories/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
export function ResearchPage({ view }: { view: "cohort" | "evaluation" }) {
  const cohort = view === "cohort";
  return (
    <Card className="gap-8 rounded-none bg-transparent mx-auto w-full max-w-[1100px] px-4 py-6 shadow-none ring-0 md:px-8 md:py-8">
      <CardContent className="flex flex-col gap-8 px-0">
        <PageHeading
          title={cohort ? "Synthetic cohort" : "Evaluation"}
          description={
            cohort
              ? "Synthetic records are kept separate from the clinical patient workspace."
              : "Real regression, held-out, synthetic, retrieval and verifier results are reported separately."
          }
        />
        <Empty className="min-h-72">
          <EmptyHeader>
            <EmptyTitle>
              {cohort
                ? "Cohort report awaiting publication"
                : "Verified results awaiting publication"}
            </EmptyTitle>
            <EmptyDescription>
              {cohort
                ? "The cohort summary will appear here after its count, size and split manifest have been verified."
                : "Only human-checked results are published here. Unmeasured experiments remain unmeasured."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
