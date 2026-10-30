import type { Screen } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export function LensHeader({
  screen,
  mock,
  loading,
  error = null,
}: {
  screen: Screen | null;
  mock: boolean;
  loading: boolean;
  error?: string | null;
}) {
  return (
    <Card className="rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="gap-2 px-0">
        <CardDescription className="flex flex-wrap items-center gap-2">
          Clinical lens
          <Badge
            variant="outline"
            className={
              !mock && !loading
                ? "border-gray-alpha-150 bg-gray-alpha-100 text-foreground"
                : undefined
            }
          >
            {mock
              ? "Demo replay"
              : loading
                ? "Checking sources"
                : error
                  ? "Check incomplete"
                  : "Source-linked"}
          </Badge>
          {screen && (
            <Badge variant="secondary">
              {screen.window.eligibleDocumentIds.length} documents · {screen.window.asOf}
            </Badge>
          )}
        </CardDescription>
        <CardTitle className="text-xl font-semibold tracking-tight">
          {screen?.situation.task ??
            (error ? "Try your situation again" : "Preparing your clinical lens")}
        </CardTitle>
        <CardDescription>
          {screen?.situation.role ?? "The eligible documents are being checked."}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
