import { describe, expect, it } from "vitest";
import { gateAnswer, splitSentences, type SentenceValidator } from "../agent/gate.ts";
import type { EvidenceWindow } from "../contracts.ts";

const window: EvidenceWindow = { asOf: "2016-04-15", eligibleDocumentIds: ["synthetic"], corpusRevision: "test" };
const evidence = { factIds: ["f-test"], segmentIds: ["synthetic-s0"], absences: [] };
const validate: SentenceValidator = async (claims) => claims.map((claim) => ({ ...claim, validation: { key: "test", support: claim.kind === "boilerplate" ? "exempt" : claim.text.includes("invented") ? "unsupported" : "supported" } }));

describe("sentence gate", () => {
  it("keeps fixed UI actions outside the clinical claim validator", async () => {
    const result = await gateAnswer("A result [f-test].", evidence, window, async (claims) => {
      expect(claims.every((claim) => claim.kind !== "boilerplate")).toBe(true);
      return validate(claims);
    });
    expect(result.nextAction).toBe("Add to the GP letter");
    expect((await gateAnswer("", evidence, window, validate)).nextAction).toBe("Leave open");
  });
  it("keeps decimal numbers and citations with their sentence", () => {
    expect(splitSentences("Value 2.5 [f-test]. Another value [synthetic-s0].")).toEqual(["Value 2.5 [f-test].", "Another value [synthetic-s0]."]);
    expect(splitSentences("A result. [f-test]")).toEqual(["A result [f-test]."]);
    expect(splitSentences("First result. [f-test] Another finding. [synthetic-s0]")).toEqual(["First result [f-test].", "Another finding [synthetic-s0]."]);
  });
  it("never emits unsupported, uncited or unknown-citation text", async () => {
    const result = await gateAnswer("A result [f-test]. An invented result [f-test]. Uncited statement. A result [f-unknown].", evidence, window, validate);
    expect(result.claims.map((claim) => claim.text)).toEqual(["A result."]);
    expect(result.nextAction).toBe("Add to the GP letter");
  });
  it("validates plain sentence text with its fact source segment", async () => {
    let seen = false;
    await gateAnswer("A result [f-test].", { ...evidence, factSegments: { "f-test": "synthetic-s0" } }, window, async (claims) => {
      if (claims[0]?.kind === "composed") {
        seen = true;
        expect(claims[0].text).toBe("A result.");
        expect(claims[0].segmentIds).toEqual(["synthetic-s0"]);
      }
      return validate(claims);
    });
    expect(seen).toBe(true);
  });
  it("requires full absence evidence and does not treat unavailable as a gap", async () => {
    const unavailable = { status: "unavailable" as const, concept: "Synthetic test", searched: { eligible: 1, total: 1, asOf: window.asOf }, segmentIds: [] };
    expect((await gateAnswer("Not documented [f-test].", { ...evidence, absences: [unavailable] }, window, validate)).claims).toEqual([]);
    const result = await gateAnswer("", { ...evidence, absences: [{ ...unavailable, status: "not_documented" }] }, window, validate);
    expect(result.claims[0].kind).toBe("absence");
    expect(result.claims[0].text).toContain("searched 1 of 1 eligible documents");
    expect(result.nextAction).toBe("Leave open");
  });
  it("waits for validation, fails closed on missing/partial verdicts, and limits speech", async () => {
    expect((await gateAnswer("A [f-test].", evidence, window, async () => [])).claims).toEqual([]);
    expect((await gateAnswer("A [f-test].", evidence, window, async (claims) => claims.map((claim) => ({ ...claim, validation: { key: "", support: "partial" } })))).claims).toEqual([]);
    expect((await gateAnswer("A [f-test]. B [f-test]. C [f-test].", evidence, window, validate, true)).claims).toHaveLength(2);
  });
  it("renders qualified follow-up absence without claiming the test never happened", async () => {
    const result = await gateAnswer("", { ...evidence, absences: [{ status: "not_documented", concept: "Documented completion after 2016-01-01 of: Synthetic repeat test.", searched: { eligible: 1, total: 1, asOf: window.asOf }, segmentIds: [] }] }, window, validate);
    expect(result.claims[0].text).toBe("Synthetic repeat test: no record of completion in the 1 eligible documents as of 15 Apr 2016.");
  });
});
