import type { Fact, Segment } from "../contracts.ts";
import { rehash } from "../ingest/extract.ts";
import { renderLine } from "../lens/templates.ts";

export function measurement(patch: Partial<Fact> = {}): Fact {
  const quote = "Synthetic observed weight 82 kg.";
  return rehash({
    id: "",
    contentHash: "",
    documentId: "synthetic-d1",
    segmentId: "synthetic-d1-s0",
    kind: "measurement",
    labelEn: "Weight",
    attrs: { value: "82", unit: "kg" },
    assertion: "present",
    temporalStatus: "stated",
    eventDate: null,
    datePrecision: null,
    dueDate: null,
    docDate: "2026-01-01",
    quote,
    start: 0,
    end: quote.length,
    entityId: null,
    locationOk: true,
    support: "supported",
    negationFlag: false,
    validatorVersion: "synthetic",
    ...patch,
  });
}

export function segmentFor(fact: Fact): Segment {
  return {
    id: fact.segmentId,
    documentId: fact.documentId,
    kind: "sentence",
    section: null,
    start: fact.start,
    end: fact.end,
    text: fact.quote,
    textEn: null,
  };
}

export function evidenceLine(fact: Fact) {
  return {
    factId: fact.id,
    segmentId: fact.segmentId,
    documentId: fact.documentId,
    quote: fact.quote,
    line: renderLine(fact, {
      patientId: "synthetic-patient",
      window: {
        asOf: "2026-01-02",
        corpusRevision: "synthetic-revision",
        eligibleDocumentIds: [fact.documentId],
      },
    }),
  };
}
