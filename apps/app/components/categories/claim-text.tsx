import type { ClaimLine } from "@medlyn/engine/contracts";
import { CardContent, CardDescription } from "@/components/ui/card";
import { claimTextParts } from "./claim-text-parts";

export function ClaimText({ claim }: { claim: ClaimLine }) {
  const { primary, source } = claimTextParts(claim);
  return (
    <CardContent className="flex min-w-0 flex-col gap-1.5 p-0">
      <CardDescription className="min-w-0 whitespace-normal break-words text-pretty leading-snug text-foreground">
        {primary}
      </CardDescription>
      {source && (
        <CardDescription className="min-w-0 whitespace-normal break-words text-pretty text-xs leading-snug">
          {source}
        </CardDescription>
      )}
    </CardContent>
  );
}
