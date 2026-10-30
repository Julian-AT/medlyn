"use client";

import { formatDate } from "@medlyn/engine/dates";
import { SourceChips } from "@/components/sources/source-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { compareMedicationLists, medicationChangeValues } from "./medication-comparison";
import type { MedicationSourceList } from "./medication-data";

export function MedicationListChanges({
  selected,
  previous,
}: {
  selected: MedicationSourceList;
  previous?: MedicationSourceList;
}) {
  const changes = previous ? compareMedicationLists(previous, selected) : [];
  return (
    <Card className="gap-4 rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="gap-2 p-0">
        <CardContent className="flex flex-wrap items-center gap-2 p-0">
          <CardTitle className="text-base font-semibold" role="heading" aria-level={2}>
            Changes since previous list
          </CardTitle>
          {previous && (
            <Badge variant="secondary" className="tabular-nums">
              {changes.length}
            </Badge>
          )}
        </CardContent>
        <CardDescription className="text-xs tabular-nums">
          {previous
            ? `${formatDate(previous.date)} → ${formatDate(selected.date)} · Source list comparison`
            : "This is the earliest source list available in this view."}
        </CardDescription>
      </CardHeader>
      {previous && (
        <CardContent className="flex flex-col gap-0 p-0">
          {changes.map((change) => {
            const entry = change.after ?? change.before;
            if (!entry) return null;
            const [before, after] = medicationChangeValues(change);
            return (
              <CardContent
                key={change.id}
                data-from-claim-id={change.before?.evidence.line.id}
                data-to-claim-id={change.after?.evidence.line.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-3 first:pt-0 last:border-0"
              >
                <CardTitle className="text-sm font-medium">{entry.attrs.generic}</CardTitle>
                <Badge variant="outline" className="font-normal">
                  {change.label}
                </Badge>
                <CardDescription className="min-w-0 flex-1 basis-64 text-sm tabular-nums">
                  {before} → {after}
                </CardDescription>
                <SourceChips
                  sources={[
                    {
                      segmentId: (change.before ?? previous.entries[0]).evidence.segmentId,
                      documentId: previous.documentId,
                      label: formatDate(previous.date),
                    },
                  ]}
                />
                <SourceChips
                  sources={[
                    {
                      segmentId: (change.after ?? selected.entries[0]).evidence.segmentId,
                      documentId: selected.documentId,
                      label: formatDate(selected.date),
                    },
                  ]}
                />
              </CardContent>
            );
          })}
          {!changes.length && (
            <CardDescription className="text-sm">
              No differences in the verified medication entries in these two lists.
            </CardDescription>
          )}
          <CardDescription className="pt-3 text-xs">
            Listing differences do not confirm that treatment was started or stopped.
          </CardDescription>
        </CardContent>
      )}
    </Card>
  );
}
