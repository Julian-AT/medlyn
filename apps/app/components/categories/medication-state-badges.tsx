import type { ClaimLine } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";

const assertions = {
  present: null,
  negated: "Negated in source",
  suspected: "Suspected",
  historical: "Historical",
};
const temporal = {
  ongoing: null,
  stated: null,
  planned: "Planned",
  recommended: "Recommended",
  done: "Completed",
  given_once: "Given once",
};

export function MedicationStateBadges({ line }: { line: ClaimLine }) {
  const labels = [assertions[line.assertion], temporal[line.temporalStatus]].filter(Boolean);
  if (!labels.length) return null;
  return (
    <CardContent className="flex flex-wrap gap-1.5 p-0">
      {labels.map((label) => (
        <Badge key={label} variant="outline">
          {label}
        </Badge>
      ))}
    </CardContent>
  );
}
