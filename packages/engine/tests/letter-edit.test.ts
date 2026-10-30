import { describe, expect, it } from "vitest";
import type { Claim, Letter } from "../contracts.ts";
import { applyLetterEdit } from "../letter/edit.ts";
import type { LetterContext } from "../letter/build.ts";

const context: LetterContext = { patientId: "p", window: { asOf: "2016-04-15", corpusRevision: "r", eligibleDocumentIds: ["d"] }, facts: [], segments: [] };
const original: Claim = { id: "claim", kind: "template", text: "Synthetic supported sentence", factIds: ["fact"], segmentIds: ["segment"], author: "machine", validation: { key: "original", support: "supported" } };
function letter(): Letter {
  return { id: "letter", sessionId: "session", lensKey: "lens", asOf: "2016-04-15", sections: [{ id: "reason", title: "Reason", claims: [structuredClone(original)] }, { id: "clinician_notes", title: "Clinician notes — not from the source documents", claims: [] }], annotations: [], createdAt: "2026-10-30T05:00:00Z", generationMs: 1 };
}
const request = { sessionId: "session", letterId: "letter", claimId: "claim", text: "An unsupported observation", author: "Clinician B" };

describe("clinician letter edits", () => {
  it("keeps failed edits in clinician notes and retains the validated original", async () => {
    const source = letter(); const calls: Claim[] = [];
    const updated = await applyLetterEdit(source, request, context, async (claim) => { calls.push(claim); return { ...claim, validation: { key: "rechecked", support: "unsupported" } }; });
    expect(calls[0].factIds).toEqual(original.factIds); expect(calls[0].segmentIds).toEqual(original.segmentIds);
    expect(updated.sections[0].claims[0].text).toBe(original.text); expect(updated.sections[0].claims[0].validation).toEqual(original.validation);
    expect(updated.sections[0].claims[0].flag?.reason).toBe("edit_unsupported");
    expect(updated.annotations[0]).toMatchObject({ text: request.text, author: "Clinician B", targetId: "claim" });
    expect(calls[1]).toMatchObject({ kind: "annotation", author: "clinician", text: request.text }); expect(updated.sections[1].claims).toEqual([]); expect(source.annotations).toEqual([]);
  });
  it("requires full support, not partial support", async () => {
    const updated = await applyLetterEdit(letter(), request, context, async (claim) => ({ ...claim, validation: { key: "partial", support: "partial" } }));
    expect(updated.annotations).toHaveLength(1); expect(updated.sections[0].claims[0].text).toBe(original.text);
  });
  it("replaces a supported edit only after validation and preserves citations", async () => {
    const updated = await applyLetterEdit(letter(), request, context, async (claim) => ({ ...claim, validation: { key: "supported-edit", support: "supported" } }));
    expect(updated.sections[0].claims[0]).toMatchObject({ text: request.text, factIds: original.factIds, segmentIds: original.segmentIds, author: "clinician" }); expect(updated.annotations).toHaveLength(0);
  });
  it("rejects a different session and unknown claim", async () => {
    const validate = async (claim: Claim) => claim;
    await expect(applyLetterEdit(letter(), { ...request, sessionId: "other" }, context, validate)).rejects.toThrow("session");
    await expect(applyLetterEdit(letter(), { ...request, claimId: "missing" }, context, validate)).rejects.toThrow("factual");
  });
});
