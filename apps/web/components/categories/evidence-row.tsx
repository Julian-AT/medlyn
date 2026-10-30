import type { ClaimLine, Fact } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { SourceChips } from "@/components/sources/source-chips";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { showClaim } from "@/lib/lens-state";

const assertionLabels = {
  present: "Present",
  negated: "Negated",
  suspected: "Suspected",
  historical: "Historical",
};
const statusLabels = {
  planned: "Planned",
  recommended: "Recommended",
  done: "Completed",
  ongoing: "Ongoing",
  given_once: "Given once",
  stated: "Stated",
};
export function EvidenceRow({ row }: { row: { fact: Fact; claim: ClaimLine } }) {
  const { fact, claim } = row;
  if (!showClaim(claim)) return null;
  const code = typeof fact.attrs.icd10 === "string" ? fact.attrs.icd10 : null;
  return (
    <CardContent data-claim-id={claim.id} className="flex min-w-0 flex-col gap-2 p-0">
      <CardDescription className="whitespace-normal break-words text-sm leading-relaxed text-foreground">
        {claim.text}
      </CardDescription>
      <CardContent className="flex flex-wrap items-center gap-2 p-0">
        <CardDescription className="text-xs tabular-nums">
          {formatDate(fact.eventDate ?? fact.docDate, fact.datePrecision)}
        </CardDescription>
        {fact.assertion !== "present" && (
          <Badge variant="outline">{assertionLabels[fact.assertion]}</Badge>
        )}
        {fact.temporalStatus !== "stated" && (
          <Badge variant="outline">{statusLabels[fact.temporalStatus]}</Badge>
        )}
        {code && <Badge variant="secondary">ICD-10 {code}</Badge>}
        <SourceChips
          sources={[{ segmentId: fact.segmentId, documentId: fact.documentId, date: fact.docDate }]}
        />
      </CardContent>
    </CardContent>
  );
}
