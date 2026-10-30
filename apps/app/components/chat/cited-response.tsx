import type { Claim } from "@medlyn/engine/contracts";
import { Fragment } from "react";
import { displayDates } from "@/components/gen-ui/display-dates";
import { CardDescription } from "@/components/ui/card";
import { citedRuns } from "./cited-text";
import { SourceCitation } from "./source-citation";

export function CitedResponse({
  text,
  claims,
  sources,
}: {
  text: string;
  claims: Claim[];
  sources: string[];
}) {
  return (
    <CardDescription className="whitespace-pre-wrap text-sm/7 text-foreground">
      {citedRuns(text, claims).map((run) => (
        <Fragment key={run.start}>
          {displayDates(run.text)}
          {run.segmentIds.map((id) => (
            <SourceCitation key={id} segmentId={id} index={sources.indexOf(id)} />
          ))}
        </Fragment>
      ))}
    </CardDescription>
  );
}
