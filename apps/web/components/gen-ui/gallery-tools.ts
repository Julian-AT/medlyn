import type { ToolUIPart } from "ai";
import type { UiToolName } from "./registry";

export const galleryTools: { name: UiToolName; title: string; input: Record<string, unknown> }[] = [
  { name: "open_lens", title: "Situation lens", input: { text: "GP follow-up" } },
  { name: "show_patient_summary", title: "Patient summary", input: {} },
  { name: "show_medications", title: "Medication lists", input: { list: "all" } },
  { name: "show_lab_trend", title: "Measurement trend", input: { measure: "weight" } },
  { name: "show_timeline", title: "Timeline", input: { kinds: ["procedure", "event"] } },
  { name: "show_findings", title: "Findings to clarify", input: {} },
  { name: "show_passage", title: "Source passage", input: {} },
  { name: "check_documented", title: "Documentation check", input: { concept: "kidney function" } },
  { name: "draft_letter", title: "GP follow-up letter", input: {} },
];

export type GalleryResult = { name: UiToolName; part: ToolUIPart };
export type GalleryLoader = () => Promise<GalleryResult[]>;
export type GalleryState = "input-streaming" | "input-available" | "output-available";
