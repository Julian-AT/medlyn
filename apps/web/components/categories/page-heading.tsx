import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="gap-2 px-0">
        <CardTitle className="text-2xl font-medium" role="heading" aria-level={1}>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
