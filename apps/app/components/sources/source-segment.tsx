import type { Segment } from "@medlyn/engine/contracts";
import { CardContent, CardDescription } from "@/components/ui/card";

export function SourceSegment({
  segment,
  language,
  cited = false,
}: {
  segment: Segment;
  language: string;
  cited?: boolean;
}) {
  const translated = language === "en" && segment.textEn !== null;
  return (
    <CardContent
      data-segment-id={segment.id}
      className={
        cited
          ? "space-y-2 rounded-xl bg-accent p-4 [&_mark]:bg-transparent [&_mark]:text-foreground"
          : "space-y-2 px-4 py-2"
      }
    >
      <CardDescription className="text-xs">
        {cited ? "Cited passage" : "Context"}
        {segment.section ? ` · ${segment.section}` : ""}
      </CardDescription>
      {language === "en" && !translated && (
        <CardDescription className="text-xs">
          Translation unavailable · German original
        </CardDescription>
      )}
      <CardDescription
        lang={translated ? "en" : "de"}
        className={`whitespace-pre-wrap break-words text-sm leading-6 ${cited ? "text-foreground" : "text-muted-foreground"} ${segment.kind === "heading" ? "font-medium" : ""}`}
      >
        {cited ? (
          <mark>{translated ? segment.textEn : segment.text}</mark>
        ) : translated ? (
          segment.textEn
        ) : (
          segment.text
        )}
      </CardDescription>
    </CardContent>
  );
}
