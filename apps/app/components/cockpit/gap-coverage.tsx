"use client";

import type { Card as ClinicalCard, EvidenceWindow } from "@medlyn/engine/contracts";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { DocumentReaderDialog } from "@/components/sources/document-reader-dialog";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { showClaim } from "@/lib/lens-state";

export function GapCoverage({ card, window }: { card: ClinicalCard; window: EvidenceWindow }) {
  const { documents } = useActivePatient();
  const absence = card.lines.find((line) => line.kind === "absence" && showClaim(line));
  if (!absence) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Compare sources · absence coverage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card.title} · absence coverage</DialogTitle>
          <DialogDescription>{absence.text}</DialogDescription>
        </DialogHeader>
        <CardContent className="space-y-3 p-0">
          {card.searched && (
            <CardDescription>
              Searched {card.searched.eligible} of {window.eligibleDocumentIds.length} eligible
              documents · as of {card.searched.asOf}
            </CardDescription>
          )}
          {window.eligibleDocumentIds.map((id) => (
            <CardContent key={id} className="flex items-center justify-between gap-3 p-0">
              <CardDescription>{documents.get(id)?.titleEn || id}</CardDescription>
              <DocumentReaderDialog documentId={id} />
            </CardContent>
          ))}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
