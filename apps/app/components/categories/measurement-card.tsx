"use client";
import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import type { ClaimLine as CheckedLine } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { ClaimLine } from "@/components/gen-ui/claim-line";
import { SourceChips } from "@/components/sources/source-chips";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showClaim } from "@/lib/lens-state";

type Point = UiToolOutputs["show_lab_trend"]["points"][number];
const config = {
  value: { label: "Value", color: "var(--chart-1)" },
  diastolic: { label: "Diastolic", color: "var(--chart-2)" },
};
export function MeasurementCard({
  title,
  points,
  compact = false,
  deltaLine,
}: {
  title: string;
  points: Point[];
  compact?: boolean;
  deltaLine?: CheckedLine | null;
}) {
  const checked = points.filter((point) => showClaim(point.line));
  const latest = checked.at(-1);
  if (!latest) return null;
  return (
    <Card className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="gap-1 p-0">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-medium tabular-nums">
          {latest.displayValue ?? `${latest.value} ${latest.unit}`}
        </CardTitle>
        <CardDescription className="text-xs">
          Latest source · {formatDate(latest.date)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3 p-0">
        {!compact && (
          <>
            <ChartContainer config={config} className="h-40 w-full">
              <LineChart data={checked} accessibilityLayer>
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis width={36} domain={["auto", "auto"]} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />
                  }
                />
                <Line
                  dataKey="value"
                  type="linear"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
                {checked.some((point) => point.diastolic !== undefined) && (
                  <Line
                    dataKey="diastolic"
                    type="linear"
                    stroke="var(--color-diastolic)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ChartContainer>
            <CardDescription className="text-xs">
              {checked.length} {checked.length === 1 ? "reading" : "readings"} · {latest.unit}.
              Same-day readings retain their source.
            </CardDescription>
          </>
        )}
        {deltaLine && <ClaimLine line={deltaLine} />}
        {compact ? (
          <SourceChips
            sources={(latest.sources ?? [latest]).map((source) => ({
              segmentId: source.segmentId,
              date: latest.date,
            }))}
          />
        ) : (
          <ScrollArea className="h-24">
            <CardContent className="flex flex-col gap-2 p-0">
              {checked.map((point) => (
                <SourceChips
                  key={`${point.factId}:${point.series}`}
                  sources={(point.sources ?? [point]).map((source) => ({
                    segmentId: source.segmentId,
                    label: `${formatDate(point.date)} · ${point.displayValue ?? `${point.value} ${point.unit}`}`,
                  }))}
                />
              ))}
            </CardContent>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
