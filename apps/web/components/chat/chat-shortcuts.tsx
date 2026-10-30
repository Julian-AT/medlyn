import {
  Alert02Icon,
  ChartLineData01Icon,
  FileEditIcon,
  Medicine01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const SHORTCUTS = [
  { title: "Medications", prompt: "Show her medications", icon: Medicine01Icon },
  { title: "Weight trend", prompt: "Weight trend", icon: ChartLineData01Icon },
  { title: "Open questions", prompt: "Any contradictions?", icon: Alert02Icon },
  { title: "GP letter", prompt: "Draft the GP letter", icon: FileEditIcon },
];

export function ChatShortcuts({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <Suggestions wrap className="justify-center gap-2" aria-label="Suggested questions">
      {SHORTCUTS.map((shortcut) => (
        <Suggestion
          key={shortcut.title}
          suggestion={shortcut.prompt}
          onClick={onSelect}
          className="h-9 gap-2 border-border/60 bg-background text-xs font-medium text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={shortcut.icon} size={15} strokeWidth={2} aria-hidden="true" />
          {shortcut.title}
        </Suggestion>
      ))}
    </Suggestions>
  );
}
