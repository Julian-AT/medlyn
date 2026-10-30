import { CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ToolSkeletonLayout = "list" | "table" | "chart" | "passage" | "compare";
const rows = ["first", "second", "third"];

export function ToolSkeleton({
  title,
  layout,
  pendingInput,
}: {
  title: string;
  layout: ToolSkeletonLayout;
  pendingInput: boolean;
}) {
  return (
    <CardContent
      role="status"
      aria-label={`Loading ${title}`}
      className="flex min-h-40 flex-col gap-4 p-0"
    >
      <CardDescription className="text-xs">
        {pendingInput ? "Preparing this view…" : "Checking eligible sources…"}
      </CardDescription>
      {layout === "chart" ? (
        <Skeleton className="h-48 w-full shrink-0 animate-none rounded-control" />
      ) : layout === "passage" ? (
        <Skeleton className="h-8 w-64 max-w-full shrink-0 animate-none rounded-control" />
      ) : null}
      <CardContent
        className={layout === "compare" ? "grid grid-cols-2 gap-3 p-0" : "grid gap-4 p-0"}
      >
        {(layout === "compare" ? rows.slice(0, 2) : rows).map((row) => (
          <CardContent key={row} className="flex min-h-10 flex-col gap-2 p-0">
            <Skeleton className="h-5 w-3/4 animate-none rounded-control" />
            {layout !== "chart" ? (
              <Skeleton className="h-4 w-full animate-none rounded-control" />
            ) : null}
            {layout === "table" ? (
              <Skeleton className="h-8 w-24 animate-none rounded-control" />
            ) : null}
          </CardContent>
        ))}
      </CardContent>
    </CardContent>
  );
}
