import type { Screen } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="gap-2 px-0">
        <CardDescription className="flex flex-wrap items-center gap-2">
          Clinical lens
          <Badge
            variant="outline"
            className={
              !mock && !loading ? "border-primary/20 bg-primary/10 text-primary" : undefined
            }
          >
            {mock ? "Demo replay" : loading ? "Checking sources" : "Source-linked"}
          </Badge>
          {screen && (
            <Badge variant="secondary">
              {screen.window.eligibleDocumentIds.length} documents · {screen.window.asOf}
            </Badge>
          )}
        </CardDescription>
        <CardTitle className="text-xl font-semibold tracking-tight">
          {screen?.situation.task ?? "Preparing your clinical lens"}
        </CardTitle>
        <CardDescription>
          {screen?.situation.role ?? "The eligible documents are being checked."}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
