import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isShowable,
  type ValidationContext,
  validateAbsence,
  validateClaim,
  validateClaims,
} from "../claims/validate.ts";
import type { AbsenceResult, Claim, Fact, Segment } from "../contracts.ts";
import { NEEDS } from "../lens/needs/catalog.ts";
import { absenceClaim, renderLine, trendLines } from "../lens/templates.ts";
import { required } from "../required.ts";

const fact: Fact = {
  id: "synthetic-f",
  segmentId: "synthetic-s",
  documentId: "synthetic-d",
  kind: "measurement",
  labelEn: "Weight 84 kg",
  attrs: { value: "84", unit: "kg" },
  assertion: "present",
  temporalStatus: "stated",
  eventDate: null,
  datePrecision: null,
  dueDate: null,
  docDate: "2016-04-15",
  quote: "Synthetic weight 84 kg.",
  start: 0,
  end: 23,
  entityId: null,
  locationOk: true,
  support: "supported",
  negationFlag: false,
  contentHash: "synthetic-h",
  validatorVersion: "synthetic-v",
};
const segment: Segment = {
  id: fact.segmentId,
  documentId: fact.documentId,
  kind: "sentence",
  section: "Synthetic section",
  text: fact.quote,
  textEn: null,
  start: 0,
  end: 23,
};
const context: ValidationContext = {
  patientId: "synthetic-p",
  window: {
    asOf: "2016-04-15",
    corpusRevision: "synthetic-r",
    eligibleDocumentIds: [fact.documentId],
  },
  facts: [fact],
  segments: [segment],
};
const composed = (text = "Weight 84 kg"): Claim => ({
  id: "synthetic-claim",
  kind: "composed",
  text,
  factIds: [fact.id],
  segmentIds: [fact.segmentId],
  author: "machine",
  validation: { key: "untrusted", support: "supported" },
});
const absence: AbsenceResult = {
  status: "not_documented",
  concept: "Kidney function",
  searched: { eligible: 1, total: 1, asOf: context.window.asOf },
  segmentIds: [],
};
function mockModel(support: string = "supported") {
  const request = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  support,
                  reason: "Synthetic evidence checked",
                  negationFlag: false,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", request);
  vi.stubEnv("MODEL_FAST", "synthetic-model");
  return request;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("single claim boundary", () => {
  it("accepts faithful templates and preserves line dimensions", async () => {
    const line = await validateClaim(renderLine(fact, context), context);
    expect(isShowable(line)).toBe(true);
    expect(line.assertion).toBe("present");
    expect(line.validation.key).not.toBe("untrusted");
  });
  it("rejects invented template fields and unsupported or missing facts", async () => {
    const line = renderLine(fact, context);
    expect(
      isShowable(await validateClaim({ ...line, text: line.text.replace("84", "85") }, context)),
    ).toBe(false);
    expect(isShowable(await validateClaim(line, { ...context, facts: [] }))).toBe(false);
    expect(
      isShowable(
        await validateClaim(line, { ...context, facts: [{ ...fact, support: "unsupported" }] }),
      ),
    ).toBe(false);
    expect(
      isShowable(
        await validateClaim(line, {
          ...context,
          window: { ...context.window, eligibleDocumentIds: [] },
        }),
      ),
    ).toBe(false);
    expect(
      (await validateClaim(line, { ...context, facts: [{ ...fact, support: "partial" }] }))
        .validation.support,
    ).toBe("partial");
  });
  it("validates only the reproducible weight calculation", async () => {
    const old = {
      ...fact,
      id: "synthetic-old",
      contentHash: "synthetic-h-old",
      attrs: { value: "96", unit: "kg" },
      labelEn: "Weight 96 kg",
      docDate: "2015-06-02",
    };
    const ctx = { ...context, facts: [old, fact] };
    const line = required(trendLines(ctx.facts, ctx).at(-1));
    expect(isShowable(await validateClaim(line, ctx))).toBe(true);
    expect(
      isShowable(await validateClaim({ ...line, text: line.text.replace("12", "13") }, ctx)),
    ).toBe(false);
  });
  it("requires completed matching absence provenance", async () => {
    const claim = absenceClaim(NEEDS.kidney_function, absence.searched, context);
    expect(isShowable(await validateClaim(claim, context))).toBe(false);
    expect(isShowable(await validateAbsence(claim, absence, context))).toBe(true);
    for (const patch of [
      { status: "unavailable" as const },
      { concept: "Eye findings" },
      { searched: { ...absence.searched, eligible: 0 } },
      { searched: { ...absence.searched, asOf: "2016-04-14" } },
      { segmentIds: [segment.id] },
    ]) {
      expect(isShowable(await validateAbsence(claim, { ...absence, ...patch }, context))).toBe(
        false,
      );
    }
    expect(
      isShowable(
        await validateAbsence(
          { ...claim, text: `${claim.text}. Normal kidney function.` },
          absence,
          context,
        ),
      ),
    ).toBe(false);
    expect(
      isShowable(
        await validateAbsence(
          { ...claim, text: claim.text.replace("Kidney function", "Kidney") },
          absence,
          context,
        ),
      ),
    ).toBe(false);
  });
  it("keeps annotations unsupported and limits boilerplate to fixed text", async () => {
    const annotation = await validateClaim({ ...composed(), kind: "annotation" }, context);
    expect(annotation.author).toBe("clinician");
    expect(annotation.validation.support).toBe("unsupported");
    const boilerplate = {
      ...composed("Dear colleague,"),
      kind: "boilerplate" as const,
      factIds: [],
      segmentIds: [],
    };
    expect((await validateClaim(boilerplate, context)).validation.support).toBe("exempt");
    expect(
      isShowable(
        await validateClaim({ ...boilerplate, text: "The patient has kidney disease." }, context),
      ),
    ).toBe(false);
  });
  it("blocks invented tokens before any semantic call", async () => {
    const request = mockModel();
    expect(isShowable(await validateClaim(composed("Weight 85 kg"), context))).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it("deduplicates parallel semantic checks and includes neighbouring context", async () => {
    const request = mockModel();
    const before = {
      ...segment,
      id: "synthetic-before",
      start: -10,
      end: -1,
      text: "Synthetic qualifier.",
    };
    const [first, second] = await validateClaims([composed(), { ...composed(), id: "second" }], {
      ...context,
      segments: [before, segment],
    });
    expect(first.validation.support).toBe("supported");
    expect(second.id).toBe("second");
    expect(request).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(
      String((request.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(payload.messages[1].content).toContain("Synthetic qualifier.");
    expect(payload.messages[1].content).toContain("Synthetic section");
  });
  it("does not show partial composed claims", async () => {
    mockModel("partial");
    const result = await validateClaim(composed(), context);
    expect(result.validation.support).toBe("partial");
    expect(isShowable(result)).toBe(false);
  });
  it("fails closed on a model failure without throwing", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic-model");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Synthetic timeout");
      }),
    );
    expect((await validateClaim(composed(), context)).validation.support).toBe("unsupported");
  });
});
