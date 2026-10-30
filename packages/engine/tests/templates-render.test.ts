import { describe, expect, it } from "vitest";
import { ClaimLine, type Fact } from "../contracts.ts";
import { medicationSchedule, factLineText, renderLine, trendLines, absenceClaim } from "../lens/templates.ts";
import { NEEDS } from "../lens/needs/catalog.ts";

const fixtureFact = (patch: Partial<Fact> = {}): Fact => ({
  id: "synthetic-f1", segmentId: "synthetic-d1-s0", documentId: "synthetic-d1", kind: "measurement", labelEn: "Weight",
  attrs: { value: "84", unit: "kg" }, assertion: "present", temporalStatus: "stated", eventDate: null, datePrecision: null, dueDate: null,
  docDate: "2016-04-15", quote: "Synthetic weight 84 kg.", start: 0, end: 26, entityId: null,
  locationOk: true, support: "supported", negationFlag: false, contentHash: "synthetic-h1", validatorVersion: "synthetic-v1", ...patch,
});
const fixtureCtx = { patientId: "synthetic-patient", window: { asOf: "2016-04-15", corpusRevision: "synthetic-revision", eligibleDocumentIds: ["synthetic-d1", "synthetic-d2"] } };

describe("templates", () => {
  it.each([
    [["1", "0", "1/2", "0"], null, "1-0-½"],
    [["1", "0", "0", "1/2"], null, "1-0-0-½"],
    [null, "ST 1x/Woche 1 Tabl.", "ST 1x/Woche 1 Tabl."],
    [null, null, ""],
  ] as const)("renders schedules %j", (schedule, text, expected) => {
    expect(medicationSchedule(schedule ? [...schedule] : null, text)).toBe(expected);
  });
  it("renders medication from checked attrs with one source date", () => {
    const fact = fixtureFact({ kind: "medication", attrs: { generic: "Synthetic drug", brand: "Synthetic brand", strength: "25 mg", unit: "Tabl.", route: null, schedule: ["1", "0", "1/2", "0"], scheduleText: null, listLabel: "Discharge medication, 15 Apr 2016", atc: null } });
    expect(factLineText(fact)).toBe("Synthetic drug (Synthetic brand) 25 mg, 1-0-½ · Discharge medication, 15 Apr 2016");
  });
  it("renders a measurement without duplicated values", () => {
    expect(factLineText(fixtureFact())).toBe("Weight 84 kg · Document, 15 Apr 2016");
    expect(factLineText(fixtureFact({ labelEn: "Weight 84 kg" }))).toBe("Weight 84 kg · Document, 15 Apr 2016");
  });
  it("preserves negated and planned assertions", () => {
    expect(factLineText(fixtureFact({ labelEn: "Atrial fibrillation", attrs: {}, assertion: "negated" }))).toContain("No Atrial fibrillation");
    expect(factLineText(fixtureFact({ kind: "procedure", labelEn: "Synthetic procedure", attrs: {}, temporalStatus: "planned", eventDate: "2016-05-16", datePrecision: "day" }))).toContain("Planned: Synthetic procedure, 16 May 2016 · Document, 15 Apr 2016");
    const line = renderLine(fixtureFact({ assertion: "negated", temporalStatus: "planned" }), fixtureCtx);
    expect(ClaimLine.safeParse(line).success).toBe(true);
    expect(line.assertion).toBe("negated");
    expect(line.temporalStatus).toBe("planned");
    expect(line.validation.key).toHaveLength(64);
  });
  it("orders weights and calculates a cited delta", () => {
    const older = fixtureFact({ id: "synthetic-f2", contentHash: "synthetic-h2", docDate: "2015-06-01", attrs: { value: "96", unit: "kg" } });
    const lines = trendLines([fixtureFact(), older], fixtureCtx);
    expect(lines.map((line) => line.factIds)).toEqual([[older.id], ["synthetic-f1"], [older.id, "synthetic-f1"]]);
    expect(lines[2].text).toBe("−12 kg, Jun 2015 → Apr 2016");
    expect(trendLines([fixtureFact({ attrs: { value: "84", unit: "lb" } }), older], fixtureCtx)).toHaveLength(2);
  });
  it("requires absence proof before an absence draft can be shown", () => {
    const draft = absenceClaim(NEEDS.kidney_function, { eligible: 2, total: 2, asOf: fixtureCtx.window.asOf }, fixtureCtx);
    expect(draft.validation.support).toBe("unsupported");
    expect(draft.text).toContain("searched 2 of 2 eligible documents");
  });
});
