import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SourceCitation } from "@/components/chat/source-citation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ChatSources({ segmentIds, checked }: { segmentIds: string[]; checked: boolean }) {
  if (!segmentIds.length && !checked) return null;
  return (
    <Card className="gap-0 rounded-none bg-transparent py-1 shadow-none ring-0">
      <CardContent className="flex flex-wrap items-center gap-2 px-0">
        {checked && (
          <Badge
            variant="secondary"
            className="h-7 gap-1.5 rounded-lg bg-primary/10 px-2 text-xs font-medium text-primary"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={14}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Source checked
          </Badge>
        )}
        {segmentIds.map((id, index) => (
          <SourceCitation key={id} segmentId={id} index={index} />
        ))}
      </CardContent>
    </Card>
  );
}
