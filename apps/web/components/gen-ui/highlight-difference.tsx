import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";

export function HighlightDifference({ text, other }: { text: string; other: string }) {
  const comparison = new Set(other.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const parts = text.split(/([\p{L}\p{N}]+)/gu);
  let offset = 0;
  return parts.map((part) => {
    const key = `${offset}:${part}`;
    offset += part.length;
    const differs = /^[\p{L}\p{N}]+$/u.test(part) && !comparison.has(part.toLocaleLowerCase());
    return differs ? (
      <Badge
        key={key}
        asChild
        variant="outline"
        className="inline rounded-sm border-0 bg-warning/10 p-0 text-sm font-normal text-foreground whitespace-pre-wrap"
      >
        <mark>{part}</mark>
      </Badge>
    ) : (
      <Fragment key={key}>{part}</Fragment>
    );
  });
}
