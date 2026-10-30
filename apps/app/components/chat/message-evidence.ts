import { Claim } from "@medlyn/engine/contracts";
import type { UIMessage } from "ai";
import { z } from "zod";
import { toolEvidence } from "./tool-evidence";

const Validated = z.object({
  claims: z.array(Claim),
  speech: z
    .object({ text: z.string().min(1), receipt: z.string().min(1) })
    .nullable()
    .optional(),
});

export const UNSUPPORTED_ANSWER =
  "Couldn't produce a supported answer. Try a more specific question.";

/** Display and actions share the exact claims admitted by the server's validation gate. */
export function messageEvidence(message: UIMessage) {
  const claims = new Map<string, Claim>();
  const speech = [];
  if (message.role === "assistant") {
    for (const part of message.parts) {
      if (part.type !== "data-validated") continue;
      const parsed = Validated.safeParse(part.data);
      if (!parsed.success) continue;
      const admitted = parsed.data.claims.filter(
        (claim) =>
          claim.kind !== "annotation" &&
          (claim.validation.support === "supported" || claim.validation.support === "exempt"),
      );
      for (const claim of admitted) claims.set(claim.id, claim);
      const signed = parsed.data.speech;
      if (signed && admitted.length === parsed.data.claims.length) {
        const text = admitted
          .slice(0, 2)
          .map((claim) => claim.text)
          .join(" ");
        if (signed.text === text) speech.push(signed);
      }
    }
  }
  const checked = [...claims.values()];
  const tools =
    message.role === "assistant"
      ? toolEvidence(message)
      : { claims: [], sources: [], excerpts: [] };
  const allClaims = [...checked, ...tools.claims];
  // The API admits patient claims before emitting text; plain replies need no claim payload.
  const textParts = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : []));
  const text = textParts.length
    ? textParts.join("\n\n")
    : checked.map((claim) => claim.text).join("\n\n");
  return {
    claims: checked,
    text,
    sources: [...new Set([...checked.flatMap((claim) => claim.segmentIds), ...tools.sources])],
    copyText: [
      ...new Set(
        [text, ...tools.claims.map((claim) => claim.text), ...tools.excerpts].filter(Boolean),
      ),
    ].join("\n\n"),
    factIds: [...new Set(allClaims.flatMap((claim) => claim.factIds))],
    checked: allClaims.length > 0,
    speech,
    notice: responseNotice(message),
    unavailable:
      !checked.length &&
      message.parts.some((part) => part.type === "text" && part.text === UNSUPPORTED_ANSWER),
  };
}

function responseNotice(message: UIMessage): string | null {
  if (message.role !== "assistant") return null;
  const statuses = message.parts.flatMap((part) => {
    if (part.type !== "data-response-status") return [];
    const result = z.object({ status: z.enum(["view", "error"]) }).safeParse(part.data);
    return result.success ? [result.data.status] : [];
  });
  if (statuses.includes("error")) return "Couldn't complete this response. Try again.";
  return statuses.includes("view") ? "Showing the source-linked view." : null;
}
