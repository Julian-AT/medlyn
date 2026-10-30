import { HugeiconsIcon } from "@hugeicons/react";
import {
  HelpCircleIcon,
  Clock01Icon,
  FileValidationIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import type { Screen } from "@medlyn/engine/contracts";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";

export function SectionCards({ screen, loading }: { screen: Screen | null; loading: boolean }) {
  const cards = screen?.sections.flatMap((section) => section.cards) ?? [];
  const metrics = [
    {
      label: "Facts shown",
      value: cards.reduce(
        (count, card) =>
          count + card.lines.filter((line) => line.validation.support === "supported").length,
        0,
      ),
      detail: "Attached to source passages",
      icon: FileValidationIcon,
    },
    {
      label: "Evidence gaps",
      value: cards.filter((card) => card.availability === "not_documented").length,
      detail: "Full absence checks completed",
      icon: HelpCircleIcon,
    },
    {
      label: "Contradictions",
      value: screen?.findings.filter((finding) => finding.type === "contradiction").length ?? 0,
      detail: "Compare original passages",
      icon: Alert02Icon,
    },
    {
      label: "Load time",
      value: loading ? "…" : `${((screen?.timings.totalMs ?? 0) / 1000).toFixed(2)} s`,
      detail: screen?.timings.cached ? "Reused validated lens" : "Complete clinical lens",
      icon: Clock01Icon,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(({ label, value, detail, icon }) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{value}</CardTitle>
            <CardAction>
              <HugeiconsIcon
                icon={icon}
                strokeWidth={2}
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            </CardAction>
            <CardDescription>{detail}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
