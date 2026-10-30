import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";

export function ShortcutTile({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: IconSvgElement;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 rounded-full text-muted-foreground shadow-none hover:text-foreground"
      onClick={onClick}
    >
      <HugeiconsIcon icon={icon} size={16} strokeWidth={2} aria-hidden="true" />
      {title}
    </Button>
  );
}
