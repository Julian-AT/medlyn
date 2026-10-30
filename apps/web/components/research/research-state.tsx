import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
export function ResearchState({
  error,
  empty,
  retry,
}: {
  error?: boolean;
  empty?: boolean;
  retry: () => void;
}) {
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Research report unavailable</AlertTitle>
        <AlertDescription>
          Reload the local report files and try again.
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (empty)
    return (
      <Empty className="h-72">
        <EmptyHeader>
          <EmptyTitle>No research report available</EmptyTitle>
          <EmptyDescription>
            Run the relevant research pipeline to create its local report, then reload this page.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={retry}>
          Reload report
        </Button>
      </Empty>
    );
  return (
    <CardContent className="grid gap-4 p-0 sm:grid-cols-2">
      <Skeleton className="h-32 w-full animate-none rounded-2xl" />
      <Skeleton className="h-32 w-full animate-none rounded-2xl" />
      <Skeleton className="h-72 w-full animate-none rounded-2xl" />
      <Skeleton className="h-72 w-full animate-none rounded-2xl" />
    </CardContent>
  );
}
export function ResearchNotice() {
  return (
    <Alert>
      <AlertTitle>Automated results; human check pending</AlertTitle>
      <AlertDescription>
        Synthetic labels are code-checked, not human gold. Each suite retains its own denominator.
      </AlertDescription>
    </Alert>
  );
}
