import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export function ShortcutTile({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: IconSvgElement;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="group h-full min-h-32 w-full min-w-0 flex-col items-start justify-start gap-3 whitespace-normal rounded-2xl p-4 text-left sm:min-h-36 sm:p-5"
      onClick={onClick}
    >
      <CardContent className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background px-0 transition-colors group-hover:bg-muted">
        <HugeiconsIcon icon={icon} size={20} strokeWidth={2} aria-hidden="true" />
      </CardContent>
      <CardContent className="min-w-0 space-y-1 px-0">
        <CardTitle className="text-sm/5 font-medium">{title}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs/5 font-normal sm:line-clamp-1">
          {description}
        </CardDescription>
      </CardContent>
    </Button>
  );
}
