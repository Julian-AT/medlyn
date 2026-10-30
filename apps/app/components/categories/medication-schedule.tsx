import type { MedicationAttrs } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MEDICATION_TIMES, medicationDose } from "./medication-format";

export function MedicationSchedule({ attrs }: { attrs: MedicationAttrs }) {
  if (!attrs.schedule) {
    return (
      <CardDescription className="max-w-60 whitespace-normal text-sm text-foreground tabular-nums">
        {attrs.scheduleText || "See source"}
      </CardDescription>
    );
  }
  return (
    <CardContent className="flex flex-col gap-1.5 p-0">
      <CardContent className="grid w-60 grid-cols-4 gap-1 p-0">
        {attrs.schedule.map((value, index) => {
          const dose = medicationDose(value);
          const zero = /^0(?:[.,]0+)?$/.test(dose);
          return (
            <Badge
              key={MEDICATION_TIMES[index]}
              variant="outline"
              aria-label={`${MEDICATION_TIMES[index]}: ${dose || "see source"}`}
              className={cn(
                "h-8 w-full rounded-lg border-transparent font-mono text-sm tabular-nums",
                zero ? "text-muted-foreground" : "bg-muted font-medium text-foreground",
              )}
            >
              {zero ? "—" : dose || "?"}
            </Badge>
          );
        })}
      </CardContent>
      {attrs.scheduleText && (
        <CardDescription className="max-w-60 whitespace-normal text-xs tabular-nums">
          {attrs.scheduleText}
        </CardDescription>
      )}
    </CardContent>
  );
}
