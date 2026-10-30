import { uiTools } from "@medlyn/engine/agent/ui-tools";
import { evidenceWindow, loadSegments } from "@medlyn/engine/store";
import type { ToolUIPart } from "ai";
import { notFound } from "next/navigation";
import { GenUiGallery } from "@/components/gen-ui/gallery";
import { type GalleryResult, galleryTools } from "@/components/gen-ui/gallery-tools";
import { activePatientId } from "@/lib/patient-server";

export default function GenUiGalleryPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  async function loadPatientViews(): Promise<GalleryResult[]> {
    "use server";
    if (process.env.NODE_ENV !== "development") throw new Error("Development only");
    const patientId = await activePatientId();
    const window = await evidenceWindow(undefined, patientId);
    const tools = uiTools({ patientId, window, sessionId: "dev-gen-ui-gallery" });
    const segments = await loadSegments(window, patientId);
    const options = { toolCallId: "dev-gen-ui-gallery", messages: [], context: {} };
    const calls = {
      open_lens: () => tools.open_lens.execute({ text: "GP follow-up" }, options),
      show_patient_summary: () => tools.show_patient_summary.execute({}, options),
      show_medications: () => tools.show_medications.execute({ list: "all" }, options),
      show_lab_trend: () => tools.show_lab_trend.execute({ measure: "weight" }, options),
      show_timeline: () => tools.show_timeline.execute({ kinds: ["procedure", "event"] }, options),
      show_findings: () => tools.show_findings.execute({}, options),
      show_passage: () => tools.show_passage.execute({ segmentId: segments[0]?.id ?? "" }, options),
      check_documented: () =>
        tools.check_documented.execute({ concept: "kidney function" }, options),
      draft_letter: () => tools.draft_letter.execute({}, options),
    };
    const results: GalleryResult[] = [];
    // Two concurrent views keep gallery work below the regression request budget.
    for (let index = 0; index < galleryTools.length; index += 2) {
      const batch = galleryTools.slice(index, index + 2);
      const settled = await Promise.allSettled(batch.map(({ name }) => calls[name]()));
      settled.forEach((result, offset) => {
        const { name, input } = batch[offset];
        const base = { type: `tool-${name}` as const, toolCallId: `gallery-${name}`, input };
        const part: ToolUIPart =
          result.status === "fulfilled"
            ? { ...base, state: "output-available", output: result.value }
            : {
                ...base,
                state: "output-error",
                errorText: "This patient view could not be loaded.",
              };
        results.push({ name, part });
      });
    }
    return results;
  }

  return <GenUiGallery loadAction={loadPatientViews} />;
}
