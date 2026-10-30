import { describe, expect, it } from "vitest";
import { validateClaim } from "../claims/validate.ts";
import type { Fact } from "../contracts.ts";
import { factLineText, renderLine, withDocumentTitles } from "../lens/templates.ts";

const fact: Fact = {
  id: "source-fixture",
  documentId: "test-document",
  segmentId: "test-document-s0",
  kind: "measurement",
  labelEn: "Test dimension",
  attrs: { value: 12, unit: "mm", sourceLabel: "Document" },
  assertion: "present",
  temporalStatus: "stated",
  eventDate: null,
  datePrecision: null,
  dueDate: null,
  docDate: "2024-01-01",
  quote: "Test dimension 12 mm",
  start: 0,
  end: 20,
  entityId: null,
  locationOk: true,
  support: "supported",
  negationFlag: false,
  contentHash: "fixture-hash",
  validatorVersion: "fixture",
};
const documents = [{ id: fact.documentId, titleEn: "Test clinic letter" }];

describe("English source titles", () => {
  it("uses the document title ahead of generic source labels without mutating facts", () => {
    const [enriched] = withDocumentTitles([fact], documents);
    expect(factLineText(enriched)).toBe("Test dimension 12 mm · Test clinic letter, 1 Jan 2024");
    expect(enriched.contentHash).toBe(fact.contentHash);
    expect(fact.attrs).not.toHaveProperty("sourceTitle");
  });
  it("uses the same title when the validator recomputes template text", async () => {
    const facts = withDocumentTitles([fact], documents);
    const ctx = {
      patientId: "fixture-patient",
      window: {
        asOf: "2024-01-01",
        corpusRevision: "fixture-revision",
        eligibleDocumentIds: [fact.documentId],
      },
      facts,
      segments: [
        {
          id: fact.segmentId,
          documentId: fact.documentId,
          kind: "sentence" as const,
          section: null,
          start: 0,
          end: 20,
          text: fact.quote,
          textEn: null,
        },
      ],
    };
    const checked = await validateClaim(renderLine(facts[0], ctx), ctx);
    expect(checked.validation.support).toBe("supported");
  });
  it("keeps source-labelled medication lists", () => {
    const [medication] = withDocumentTitles(
      [
        {
          ...fact,
          kind: "medication",
          attrs: {
            generic: "Fixture medicine",
            brand: null,
            strength: "10 mg",
            unit: "mg",
            route: null,
            schedule: null,
            scheduleText: null,
            listLabel: "Discharge medication",
            atc: null,
          },
        },
      ],
      documents,
    );
    expect(factLineText(medication)).toBe(
      "Fixture medicine 10 mg · Discharge medication, 1 Jan 2024",
    );
  });
  it("keeps the generic fallback when no matching English title exists", () => {
    expect(withDocumentTitles([fact], [])[0]).toBe(fact);
    expect(withDocumentTitles([fact], [{ id: fact.documentId, titleEn: "  " }])[0]).toBe(fact);
  });
});
