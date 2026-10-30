"use client";

import type { LetterSection as ClinicalSection } from "@medlyn/engine/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showClaim } from "@/lib/lens-state";
import { LetterSentence } from "./letter-sentence";
import { SourceChip } from "./source-chip";

export function LetterSection({
  section,
  citations,
  onSave,
  busy,
}: {
  section: ClinicalSection;
  citations: string[];
  onSave: (id: string, text: string) => Promise<boolean>;
  busy: boolean;
}) {
  const claims = section.claims.filter(showClaim);
  return (
    <Card size="sm" className="rounded-xl border border-gray-alpha-150 shadow-none ring-0">
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {section.id === "medication" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication and schedule as documented</TableHead>
                <TableHead className="print:hidden">Sources</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="whitespace-normal align-top">
                    <LetterSentence
                      claim={claim}
                      citations={citations}
                      onSave={onSave}
                      busy={busy}
                      hideSources
                    />
                  </TableCell>
                  <TableCell className="space-y-1 align-top print:hidden">
                    {claim.segmentIds.map((id) => (
                      <SourceChip key={id} segmentId={id} index={citations.indexOf(id) + 1} />
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          claims.map((claim) => (
            <LetterSentence
              key={claim.id}
              claim={claim}
              citations={citations}
              onSave={onSave}
              busy={busy}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
