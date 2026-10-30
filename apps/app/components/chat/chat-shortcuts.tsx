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
    prompt: "Show the documented medication lists with their source and date",
    icon: Medicine01Icon,
  },
  {
    title: "Weight trend",
    prompt: "Show the weight trend",
    icon: ChartLineData01Icon,
  },
  {
    title: "Open questions",
    prompt: "Show the documented contradictions and open questions",
    icon: Alert02Icon,
  },
  {
    title: "GP letter",
    prompt: "Draft the GP follow-up letter",
    icon: FileEditIcon,
  },
];

const SITUATIONS = [
  { id: "anaesthesia_preop", title: "Pre-op", icon: HeartCheckIcon },
  {
    id: "surgery_tumour_board",
    title: "Tumour board",
    icon: Hospital01Icon,
  },
  {
    id: "gp_diabetes",
    title: "Diabetes review",
    icon: TestTube01Icon,
  },
  {
    id: "emergency_dizziness",
    title: "Dizziness",
    icon: StethoscopeIcon,
  },
  {
    id: "open_followups",
    title: "Follow-ups",
    icon: Task01Icon,
  },
];

export function ChatShortcuts({ onSelect }: { onSelect: (text: string, chipId?: string) => void }) {
  return (
    <CardContent
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-0"
      aria-label="Shortcuts and clinical situations"
    >
      <CardContent
        className="flex flex-wrap justify-center gap-3 px-0"
        role="group"
        aria-label="Quick actions"
      >
        {SHORTCUTS.map((shortcut) => (
          <ShortcutTile
            key={shortcut.title}
            {...shortcut}
            onClick={() => onSelect(shortcut.prompt)}
          />
        ))}
      </CardContent>
      <CardContent className="flex w-full flex-col items-center gap-3 px-0">
        <CardContent
          className="flex flex-wrap justify-center gap-3 px-0"
          role="group"
          aria-label="Situations"
        >
          {SITUATIONS.map((situation) => {
            const chip = CHIPS.find((entry) => entry.id === situation.id);
            if (!chip) return null;
            return (
              <ShortcutTile
                key={chip.id}
                title={situation.title}
                icon={situation.icon}
                onClick={() => onSelect(chip.text, chip.id)}
              />
            );
          })}
        </CardContent>
      </CardContent>
    </CardContent>
  );
}
