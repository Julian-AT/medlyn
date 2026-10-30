"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const statuses = {
  contradiction: {
    label: "Contradiction",
    explanation:
      "Sources disagree about the same event or measurement. Compare all passages before deciding.",
  },
  needs_clarification: {
    label: "Needs clarification",
    explanation:
      "The sources leave an uncertainty. Different dates or contexts may explain it; a contradiction is not established.",
  },
  not_documented: {
    label: "Not documented",
    explanation:
      "Every eligible document was checked without finding this information. This does not mean the event never happened.",
  },
  unavailable: {
    label: "Couldn't check",
    explanation:
      "The evidence check did not finish. Documentation may exist; retry before treating this as a gap.",
  },
} as const;

export function WorkflowStatus({
  status,
  onCompare,
}: {
  status: keyof typeof statuses;
  onCompare?: () => void;
}) {
  const { label, explanation } = statuses[status];
  const warning = status === "contradiction" || status === "needs_clarification";
  const className = warning
    ? "h-6 w-fit border-warning/30 bg-warning/10 px-2 text-xs text-warning"
    : "h-6 w-fit text-xs";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onCompare ? (
          <Button variant="outline" size="sm" className={className} onClick={onCompare}>
            {label} · Compare
          </Button>
        ) : (
          <Badge variant="outline" className={className} tabIndex={0}>
            {label}
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}
