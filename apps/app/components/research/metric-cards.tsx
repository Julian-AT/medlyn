import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export function MetricCards({
  items,
}: {
  items: { label: string; value: string; detail: string }[];
}) {
  return (
    <CardContent className="grid gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-w-0 gap-3 rounded-2xl border p-4 shadow-none ring-0">
          <CardHeader className="gap-2 p-0">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-3xl font-medium tabular-nums">{item.value}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CardDescription className="text-xs">{item.detail}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </CardContent>
  );
}
