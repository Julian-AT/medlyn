"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Dot, Line, LineChart, XAxis, YAxis } from "recharts";
import { SourceChips } from "@/components/patient/source-chips";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { groupEvidence } from "@/lib/group-evidence";
import { ClaimLine } from "./claim-line";
import { displayDates } from "./display-dates";
import { showSource } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

type Point = UiToolOutputs["show_lab_trend"]["points"][number];
const config = { value: { label: "Value", color: "var(--chart-1)" } };

export function LabTrend(props: ToolProps<UiToolOutputs["show_lab_trend"]>) {
  const { output } = props;
  const facts = usePatientFacts();
  const sourceGroups = groupEvidence(
    output?.points ?? [],
    (point) => point.line,
    (point) => facts.get(point.factId),
    (point) => [point.series, point.date, point.value, point.unit],
  );
  const sourceById = new Map(
    sourceGroups.map((group) => [`${group.item.factId}:${group.item.series}`, group.sources]),
  );
  const groups = new Map<string, Point[]>();
  for (const { item: point } of sourceGroups) {
    const key = `${point.series} · ${point.unit}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  return (
    <ToolFrame
      {...props}
      artifact={props.toolCallId ? { kind: "chart", id: props.toolCallId } : undefined}
      title={output?.measure.replaceAll("_", " ") || "Measurement trend"}
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
      action={
        output && (
          <Badge variant="secondary" className="font-mono">
            {sourceGroups.length} points
          </Badge>
        )
      }
    >
      {output?.points.length === 0 ? (
        <CardDescription>
          No numeric points to display. This view is not an absence check.
        </CardDescription>
      ) : null}
      {[...groups].map(([label, points]) => (
        <CardContent key={label} className="flex flex-col gap-3 px-0">
          <CardDescription className="text-xs font-medium">{label}</CardDescription>
          <ChartContainer config={config} className="h-48 w-full tabular-nums">
            <LineChart data={points} accessibilityLayer>
              <XAxis
                dataKey="date"
                tickFormatter={displayDates}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
              <ChartTooltip
                content={
                  <ChartTooltipContent labelFormatter={(label) => displayDates(String(label))} />
                }
              />
              <Line
                dataKey="value"
                type="linear"
                stroke="var(--color-value)"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(dot) => {
                  const point = dot.payload as Point;
                  return (
                    <Dot
                      key={`${point.factId}:${point.series}`}
                      cx={dot.cx}
                      cy={dot.cy}
                      r={4}
                      fill="var(--color-value)"
                      stroke="var(--background)"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open source for ${point.date}: ${point.value} ${point.unit}`}
                      onClick={() => showSource(point.segmentId)}
                      onKeyDown={(_dot, event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          showSource(point.segmentId);
                        }
                      }}
                    />
                  );
                }}
              />
            </LineChart>
          </ChartContainer>
          {points.map((point) => (
            <SourceChips
              key={`${point.factId}:${point.series}`}
              sources={(sourceById.get(`${point.factId}:${point.series}`) ?? [point]).map(
                (entry) => ({
                  segmentId: entry.segmentId,
                  quote: entry.quote,
                  date: facts.get(entry.factId)?.docDate,
                  label: `${displayDates(entry.date)} · ${entry.value} ${entry.unit}`,
                }),
              )}
            />
          ))}
        </CardContent>
      ))}
      {output?.deltaLine ? <ClaimLine line={output.deltaLine} /> : null}
    </ToolFrame>
  );
}
