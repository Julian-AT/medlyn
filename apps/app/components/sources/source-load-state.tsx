"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SourceLoadState({ error, retry }: { error: boolean; retry: () => void }) {
  if (!error)
    return (
      <Skeleton className="h-40 w-full rounded-xl" role="status" aria-label="Loading source" />
    );
  return (
    <Alert>
      <AlertDescription>
        Couldn't load this source. The evidence service may be unavailable.
        <Button type="button" variant="outline" size="sm" onClick={retry} className="mt-2 w-fit">
          Retry source
        </Button>
      </AlertDescription>
    </Alert>
  );
}
