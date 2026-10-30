import "server-only";
import { isShowable, validateClaim } from "@medlyn/engine/claims/validate";
import { ClaimLine, type EvidenceWindow } from "@medlyn/engine/contracts";
import { factLineText, renderLine, withDocumentTitles } from "@medlyn/engine/lens/templates";
import { loadEvidence } from "@medlyn/engine/store";

export async function patientEvidence(patientId: string, window: EvidenceWindow) {
  const evidence = await loadEvidence(window, patientId);
  return {
    ...evidence,
    rawFacts: evidence.facts,
    facts: withDocumentTitles(evidence.facts, evidence.documents),
    patientId,
    window,
    titledLines: new Map<string, Promise<ClaimLine>>(),
  };
}

/** Re-render only recognized fact templates, then cross the same claim boundary. */
export async function titleOutput<T>(
  value: T,
  evidence: Awaited<ReturnType<typeof patientEvidence>>,
): Promise<T> {
  const visit = async (node: unknown): Promise<unknown> => {
    if (Array.isArray(node)) return Promise.all(node.map(visit));
    if (!node || typeof node !== "object") return node;
    const parsed = ClaimLine.safeParse(node);
    if (parsed.success && parsed.data.kind === "template" && parsed.data.factIds.length === 1) {
      const claim = parsed.data;
      const fact = evidence.facts.find((entry) => entry.id === claim.factIds[0]);
      const original = evidence.rawFacts.find((entry) => entry.id === claim.factIds[0]);
      if (
        fact &&
        original &&
        isShowable(claim) &&
        [factLineText(original), factLineText(fact)].includes(claim.text)
      ) {
        const checked =
          evidence.titledLines.get(fact.id) ?? validateClaim(renderLine(fact, evidence), evidence);
        evidence.titledLines.set(fact.id, checked);
        return { ...node, ...(await checked) };
      }
      return node;
    }
    return Object.fromEntries(
      await Promise.all(Object.entries(node).map(async ([key, item]) => [key, await visit(item)])),
    );
  };
  return (await visit(value)) as T;
}
