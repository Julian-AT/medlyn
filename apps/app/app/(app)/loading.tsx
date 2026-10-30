import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <Card
      className="gap-8 rounded-none bg-transparent mx-auto w-full max-w-[1100px] px-4 py-6 shadow-none ring-0 md:px-8 md:py-8"
      aria-busy="true"
      aria-label="Loading patient workspace"
    >
      <CardHeader className="gap-3 px-0">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
