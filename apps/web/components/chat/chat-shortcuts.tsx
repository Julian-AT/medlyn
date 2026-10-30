import {
  Alert02Icon,
  ChartLineData01Icon,
  FileEditIcon,
  HeartCheckIcon,
  Hospital01Icon,
  Medicine01Icon,
  StethoscopeIcon,
  Task01Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { CardContent } from "@/components/ui/card";
import { ShortcutTile } from "./shortcut-tile";

const SHORTCUTS = [
  {
    title: "Medications",
    description: "Compare dated medication lists",
    prompt: "Show the documented medication lists with their source and date",
    icon: Medicine01Icon,
  },
  {
    title: "Weight trend",
    description: "Explore measurements over time",
    prompt: "Show the weight trend",
    icon: ChartLineData01Icon,
  },
  {
    title: "Open questions",
    description: "Review findings needing clarification",
    prompt: "Show the documented contradictions and open questions",
    icon: Alert02Icon,
  },
  {
    title: "GP letter",
    description: "Draft a source-linked follow-up",
    prompt: "Draft the GP follow-up letter",
    icon: FileEditIcon,
  },
];

const SITUATIONS = [
  { id: "anaesthesia_preop", icon: HeartCheckIcon, description: "Review risks before surgery" },
  {
    id: "surgery_tumour_board",
    icon: Hospital01Icon,
    description: "Review pathology and the board plan",
  },
  {
    id: "gp_diabetes",
    icon: TestTube01Icon,
    description: "Review treatment and metabolic follow-up",
  },
  {
    id: "emergency_dizziness",
    icon: StethoscopeIcon,
    description: "Explore earlier episodes and findings",
  },
  {
    id: "open_followups",
    icon: Task01Icon,
    description: "Check recommendations against later records",
  },
];

export function ChatShortcuts({ onSelect }: { onSelect: (text: string, chipId?: string) => void }) {
  return (
    <CardContent
      className="grid w-full grid-cols-2 gap-1 px-0 sm:grid-cols-3 sm:gap-2"
      aria-label="Shortcuts and clinical situations"
    >
      {SHORTCUTS.map((shortcut) => (
        <ShortcutTile
          key={shortcut.title}
          {...shortcut}
          onClick={() => onSelect(shortcut.prompt)}
        />
      ))}
      {SITUATIONS.map((situation) => {
        const chip = CHIPS.find((entry) => entry.id === situation.id);
        if (!chip) return null;
        return (
          <ShortcutTile
            key={chip.id}
            title={chip.label}
            description={situation.description}
            icon={situation.icon}
            onClick={() => onSelect(chip.text, chip.id)}
          />
        );
      })}
    </CardContent>
  );
}
