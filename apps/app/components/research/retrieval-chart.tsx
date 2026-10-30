"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { EvaluationReport } from "@/app/api/research/evaluation/evaluation-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { count, percent } from "./report-values";

const config = {
  recallAt5: { label: "Recall@5", color: "var(--chart-1)" },
  recallAt10: { label: "Recall@10", color: "var(--chart-2)" },
};
export function RetrievalChart({ retrieval }: { retrieval: EvaluationReport["retrieval"] }) {
  return (
    <Card className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Retrieval recall</CardTitle>
        <CardDescription>
          Synthetic queries · {count(retrieval.cases)} cases. Failed modes remain unmeasured.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {retrieval.modes.some((mode) => mode.recallAt5 !== null) ? (
          <ChartContainer config={config} className="h-60 w-full">
            <BarChart
              data={retrieval.modes.filter((mode) => mode.recallAt5 !== null)}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 1]}
                width={44}
                tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) =>
                      `${config[name as keyof typeof config]?.label ?? name}: ${percent(Number(value))}`
                    }
                  />
                }
              />
              <Bar
                dataKey="recallAt5"
                fill="var(--color-recallAt5)"
                radius={4}
                isAnimationActive={false}
              />
              <Bar
                dataKey="recallAt10"
                fill="var(--color-recallAt10)"
                radius={4}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <CardDescription className="flex h-60 items-center justify-center">
            No measured retrieval results available.
          </CardDescription>
        )}
        <Table className="table-fixed [&_th]:whitespace-normal">
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Recall@5</TableHead>
              <TableHead>Recall@10</TableHead>
              <TableHead>Cases</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retrieval.modes.map((mode) => (
              <TableRow key={mode.label}>
                <TableCell className="whitespace-normal">
                  {mode.label}
                  <CardDescription className="text-xs">
                    {mode.status === "measured" ? "Measured" : "Unavailable"}
                  </CardDescription>
                </TableCell>
                <TableCell className="tabular-nums whitespace-normal">
                  {percent(mode.recallAt5)}
                </TableCell>
                <TableCell className="tabular-nums whitespace-normal">
                  {percent(mode.recallAt10)}
                </TableCell>
                <TableCell className="tabular-nums">{count(mode.evaluated)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
