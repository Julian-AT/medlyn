import { Claim, Finding, PassageView } from "@medlyn/engine/contracts";
import { isToolUIPart, type UIMessage } from "ai";

const VISIBLE_TOOLS = new Set([
  "tool-open_lens",
  "tool-show_patient_summary",
  "tool-show_medications",
  "tool-show_lab_trend",
  "tool-show_timeline",
  "tool-show_findings",
  "tool-show_passage",
  "tool-draft_letter",
]);

/** Extract action content from checked display objects, never raw search result prose. */
export function toolEvidence(message: UIMessage) {
  const claims = new Map<string, Claim>();
  const sourceIds = new Set<string>();
  const excerpts = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if ("validation" in value) {
      const parsed = Claim.safeParse(value);
      if (
        parsed.success &&
        parsed.data.kind !== "annotation" &&
        (parsed.data.validation.support === "supported" ||
          parsed.data.validation.support === "exempt")
      )
        claims.set(parsed.data.id, parsed.data);
      return;
    }
    if ("passages" in value && "type" in value) {
      const parsed = Finding.safeParse(value);
      if (parsed.success) {
        excerpts.add(`${parsed.data.title}\n${parsed.data.explanation}`);
        for (const passage of parsed.data.passages) {
          sourceIds.add(passage.segmentId);
          excerpts.add(passage.quote);
        }
      }
      return;
    }
    if ("document" in value && "segment" in value) {
      const parsed = PassageView.safeParse(value);
      if (parsed.success) {
        sourceIds.add(parsed.data.segment.id);
        excerpts.add(parsed.data.segment.text);
      }
      return;
    }
    Object.values(value).forEach(visit);
  };
  for (const part of message.parts) {
    if (isToolUIPart(part) && VISIBLE_TOOLS.has(part.type) && part.state === "output-available")
      visit(part.output);
  }
  for (const claim of claims.values()) for (const id of claim.segmentIds) sourceIds.add(id);
  return { claims: [...claims.values()], sources: [...sourceIds], excerpts: [...excerpts] };
}
