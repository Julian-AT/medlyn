import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import type { MedicationEntry } from "./medication-data";
import { MedicationStateBadges } from "./medication-state-badges";

export function MedicationName({ entry }: { entry: MedicationEntry }) {
  const { attrs, critical, evidence } = entry;
  return (
    <CardContent className="flex min-w-0 flex-col items-start gap-1.5 p-0">
      <CardTitle className="min-w-0 whitespace-normal break-words text-sm font-semibold leading-snug">
        {attrs.generic}
      </CardTitle>
      {attrs.brand && attrs.brand.toLowerCase() !== attrs.generic.toLowerCase() && (
        <CardDescription className="min-w-0 whitespace-normal break-words text-xs leading-snug">
          {attrs.brand}
        </CardDescription>
      )}
      {critical && evidence.line.assertion === "present" && (
        <Badge variant="destructive">Antithrombotic</Badge>
      )}
      <MedicationStateBadges line={evidence.line} />
    </CardContent>
  );
}
