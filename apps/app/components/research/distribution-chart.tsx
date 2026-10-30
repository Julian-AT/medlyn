"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const config = { count: { label: "Patients", color: "var(--chart-1)" } };
export function DistributionChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: { label: string; count: number }[];
}) {
  return (
    <Card className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={data} accessibilityLayer margin={{ left: 0, right: 4, bottom: 24 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              tickFormatter={(value: string) =>
                value.length > 20 ? `${value.slice(0, 18)}…` : value
              }
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                value >= 1000 ? `${value / 1000}k` : String(value)
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
