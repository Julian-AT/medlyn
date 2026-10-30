import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { categoryProjections } from "./category-projections";
import { EvidenceRow } from "./evidence-row";
import type { PatientRow } from "./patient-data";
export function GroupedClinicalList({
  groups,
}: {
  groups: { title: string; rows: PatientRow[] }[];
}) {
  return (
    <CardContent className="flex min-w-0 flex-col gap-6 p-0">
      {groups
        .filter((group) => group.rows.length)
        .map((group) => (
          <Card
            key={group.title}
            className="gap-4 rounded-none bg-transparent py-0 shadow-none ring-0"
          >
            <CardHeader className="p-0">
              <CardTitle>{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-4 p-0 md:grid-cols-2">
              {categoryProjections(group.rows).map((projection) => (
                <Card
                  key={projection.key}
                  className="min-w-0 gap-3 rounded-2xl border p-4 shadow-none ring-0"
                >
                  <EvidenceRow row={projection.latest} />
                  {projection.history.length > 1 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 rounded-control">
                          View history · {projection.history.length - 1}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-3">
                        {projection.history.slice(1).map((row) => (
                          <EvidenceRow key={row.fact.id} row={row} />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  <CardDescription className="text-xs">
                    {projection.sourceCount} source{" "}
                    {projection.sourceCount === 1 ? "document" : "documents"}
                  </CardDescription>
                </Card>
              ))}
            </CardContent>
          </Card>
        ))}
    </CardContent>
  );
}
export function diagnosisGroups(rows: PatientRow[]) {
  return [
    {
      title: "Active & stated diagnoses",
      rows: rows.filter(
        ({ fact }) => fact.assertion === "present" && fact.temporalStatus !== "done",
      ),
    },
    { title: "Suspected", rows: rows.filter(({ fact }) => fact.assertion === "suspected") },
    {
      title: "History",
      rows: rows.filter(
        ({ fact }) =>
          fact.assertion === "historical" ||
          (fact.assertion === "present" && fact.temporalStatus === "done"),
      ),
    },
    { title: "Ruled out in source", rows: rows.filter(({ fact }) => fact.assertion === "negated") },
  ];
}
