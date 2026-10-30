import {
  Alert02Icon,
  ChartLineData01Icon,
  FileEditIcon,
  Medicine01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SHORTCUTS = [
  {
    title: "Medications",
    description: "Compare lists and their sources",
    prompt: "Show her medications",
    icon: Medicine01Icon,
    gradient: "bg-[image:var(--gradient-2)]",
  },
  {
    title: "Weight trend",
    description: "Explore measurements over time",
    prompt: "Weight trend",
    icon: ChartLineData01Icon,
    gradient: "bg-[image:var(--gradient-5)]",
  },
  {
    title: "Open questions",
    description: "Review gaps and conflicting records",
    prompt: "Any contradictions?",
    icon: Alert02Icon,
    gradient: "bg-[image:var(--gradient-4)]",
  },
  {
    title: "GP letter",
    description: "Prepare a source-linked draft",
    prompt: "Draft the GP letter",
    icon: FileEditIcon,
    gradient: "bg-[image:var(--gradient-3)]",
  },
];

export function ChatShortcuts({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <Card className="grid grid-cols-1 gap-3 overflow-visible bg-transparent p-0 shadow-none ring-0 sm:grid-cols-2">
      {SHORTCUTS.map((shortcut) => (
        <Card
          key={shortcut.title}
          className="relative gap-0 rounded-2xl border-0 bg-muted/40 py-5 shadow-none ring-0 transition-colors hover:border-primary/30 hover:bg-accent/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        >
          <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-5">
            <CardContent
              className={`row-span-2 flex size-10 items-center justify-center rounded-xl p-0 ${shortcut.gradient}`}
              aria-hidden="true"
            >
              <HugeiconsIcon
                icon={shortcut.icon}
                size={20}
                strokeWidth={1.75}
                className="text-foreground/80"
                aria-hidden="true"
              />
            </CardContent>
            <CardTitle className="text-sm font-medium">
              <Button
                variant="link"
                className="h-auto justify-start p-0 text-foreground after:absolute after:inset-0 after:rounded-2xl hover:no-underline focus-visible:ring-0"
                onClick={() => onSelect(shortcut.prompt)}
              >
                {shortcut.title}
              </Button>
            </CardTitle>
            <CardDescription className="text-xs/relaxed">{shortcut.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </Card>
  );
}
