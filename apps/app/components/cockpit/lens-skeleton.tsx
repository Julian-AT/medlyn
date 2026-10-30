import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LensSkeleton({ title = "Checking relevant facts" }: { title?: string }) {
  return (
    <Card className="gap-3 rounded-none bg-transparent py-0 shadow-none ring-0" aria-label={title}>
      <CardHeader className="px-0">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      {[0, 1].map((id) => (
        <Card key={id} size="sm" className="min-h-36 gap-3 rounded-2xl border shadow-none ring-0">
          <CardHeader>
            <Skeleton className="h-4 w-48 max-w-full animate-none" />
            <Skeleton className="h-3 w-64 max-w-full animate-none" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full animate-none" />
            <Skeleton className="h-4 w-3/4 animate-none" />
            <Skeleton className="h-5 w-20 animate-none" />
          </CardContent>
        </Card>
      ))}
    </Card>
  );
}
