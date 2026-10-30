"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Dot, Line, LineChart, XAxis, YAxis } from "recharts";
import { CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ClaimLine } from "./claim-line";
import { SourceChip, showSource } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

type Point = UiToolOutputs["show_lab_trend"]["points"][number];
const config = { value: { label: "Value", color: "var(--chart-1)" } };

export function LabTrend(props: ToolProps<UiToolOutputs["show_lab_trend"]>) {
  const { output } = props;
  const groups = new Map<string, Point[]>();
  for (const point of output?.points ?? []) {
    const key = `${point.series} · ${point.unit}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  return (
    <ToolFrame
      {...props}
      title={output?.measure.replaceAll("_", " ") || "Measurement trend"}
      description={output ? `As of ${output.asOf}` : undefined}
    >
      {output?.points.length === 0 ? (
        <CardDescription>
          No numeric points to display. This view is not an absence check.
        </CardDescription>
      ) : null}
      {[...groups].map(([label, points]) => (
        <CardContent key={label} className="space-y-2 px-0">
          <CardDescription className="text-xs">{label}</CardDescription>
          <ChartContainer config={config} className="h-44 w-full tabular-nums">
            <LineChart data={points} accessibilityLayer>
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="value"
                type="linear"
                stroke="var(--color-value)"
                strokeWidth={1.5}
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
            <SourceChip
              key={`${point.factId}:${point.series}`}
              segmentId={point.segmentId}
              quote={point.quote}
              label={`${point.date} · ${point.value} ${point.unit}`}
            />
          ))}
        </CardContent>
      ))}
      {output?.deltaLine ? <ClaimLine line={output.deltaLine} /> : null}
    </ToolFrame>
  );
}
