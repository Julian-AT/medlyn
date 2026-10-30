import type { MedicationAttrs } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MEDICATION_TIMES, medicationDose } from "./medication-format";

export function MedicationSchedule({ attrs }: { attrs: MedicationAttrs }) {
  if (!attrs.schedule) {
    return (
      <CardDescription className="min-w-0 whitespace-normal break-words text-sm leading-snug text-foreground tabular-nums">
        {attrs.scheduleText || "See source"}
      </CardDescription>
    );
  }
  return (
    <CardContent className="flex min-w-0 flex-col gap-1.5 p-0">
      <CardContent className="grid w-full grid-cols-4 gap-1 p-0">
        {attrs.schedule.map((value, index) => {
          const dose = medicationDose(value);
          const zero = /^0(?:[.,]0+)?$/.test(dose);
          return (
            <CardContent key={MEDICATION_TIMES[index]} className="flex min-w-0 flex-col gap-1 p-0">
              <CardDescription className="text-center text-xs @3xl/medications:hidden">
                {MEDICATION_TIMES[index]}
              </CardDescription>
              <Badge
                variant="outline"
                aria-label={`${MEDICATION_TIMES[index]}: ${dose || "see source"}`}
                className={cn(
                  "min-h-8 w-full whitespace-normal rounded-lg border-transparent px-1 text-center font-mono text-sm tabular-nums",
                  zero ? "text-muted-foreground" : "bg-muted font-medium text-foreground",
                )}
              >
                {zero ? "—" : dose || "?"}
              </Badge>
            </CardContent>
          );
        })}
      </CardContent>
      {attrs.scheduleText && (
        <CardDescription className="min-w-0 whitespace-normal break-words text-xs leading-snug tabular-nums">
          {attrs.scheduleText}
        </CardDescription>
      )}
    </CardContent>
  );
}
