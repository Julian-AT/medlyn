import { CheckCheck } from "lucide-react";
import type { Screen } from "@medlyn/engine/contracts";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function LensHeader({
  screen,
  mock,
  loading,
}: {
  screen: Screen | null;
  mock: boolean;
  loading: boolean;
}) {
  return (
    <>
      {" "}
      <Card className="bg-transparent py-0 ring-0 print:hidden">
        <CardHeader className="gap-2 px-0">
          <CardDescription className="flex flex-wrap items-center gap-2">
            <CheckCheck className="size-4 text-primary" />
            Clinical lens
            <Badge variant={mock ? "outline" : "secondary"}>
              {mock ? "Situation 1 · demo replay" : "Source-linked"}
            </Badge>
            <Badge variant="outline">Tier {screen?.situation.tier ?? 1}</Badge>
            <Badge variant="outline">
              {screen?.window.eligibleDocumentIds.length ?? "…"} documents
            </Badge>
          </CardDescription>
          <CardTitle className="text-xl">
            {screen?.situation.task ?? "Preparing your workspace"}
          </CardTitle>
          <CardDescription>
            {screen?.situation.role ?? "Checking the eligible documents"}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className="bg-transparent py-0 ring-0 print:hidden">
        <CardContent className="px-0">
          <SectionCards screen={screen} loading={loading} />
        </CardContent>
      </Card>
    </>
  );
}
