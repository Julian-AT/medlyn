import {
  Calendar03Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  File02Icon,
  Medicine01Icon,
  ShieldAlertIcon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accents = {
  overview: { icon: File02Icon },
  medications: { icon: Medicine01Icon },
  diagnoses: { icon: Task01Icon },
  labs: { icon: ChartLineData01Icon },
  imaging: { icon: File02Icon },
  oncology: { icon: SparklesIcon },
  procedures: { icon: Calendar03Icon },
  allergies: { icon: ShieldAlertIcon },
  timeline: { icon: Calendar03Icon },
  documents: { icon: File02Icon },
  situations: { icon: SparklesIcon },
  verified: { icon: CheckmarkCircle02Icon },
};

export type CategoryAccentKey = keyof typeof accents;

export function CategoryAccent({
  category,
  className,
}: {
  category: CategoryAccentKey;
  className?: string;
}) {
  const { icon } = accents[category];
  return (
    <CardContent
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-alpha-100 p-0 text-text-secondary",
        className,
      )}
    >
      <HugeiconsIcon icon={icon} size={20} strokeWidth={2} />
    </CardContent>
  );
}
