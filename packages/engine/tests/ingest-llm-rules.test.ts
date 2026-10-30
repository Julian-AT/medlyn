import { describe, expect, it } from "vitest";
import { getDb } from "../db/client.ts";
import type { Corpus } from "../ingest/corpus.ts";
import { conceptCoverage, hintCovered } from "../ingest/coverage.ts";
import {
  dedupeFacts,
  type ExtractedFact,
  locatedFact,
  mapBounded,
  rehash,
  validEventDate,
  withTransientRetry,
} from "../ingest/extract.ts";
import type { ConceptHint } from "../ingest/recall.ts";
import { chunks, factNegationFlag } from "../ingest/semantic.ts";
import { buildWriteQueries, DELETE_ORDER } from "../ingest/write.ts";
import { required } from "../required.ts";

const corpus: Corpus = {
  patient: {
    id: "synthetic",
    displayName: "Example",
    sex: "X",
    birthDate: "1980-01-01",
    birthDateQuote: "",
    birthDateSegmentId: null,
  },
  revisionId: "rev-synthetic",
  documentsHash: "synthetic",
  documents: [
    {
      doc: {
        id: "doc",
        patientId: "synthetic",
        revisionId: "rev-synthetic",
        title: "Test",
        titleEn: "Test",
        docType: "test",
        docDate: "2024-01-01",
        department: "test",
      },
      rawText: "Puls 72/min.",
      normText: "Puls 72/min.",
      offsetMap: [],
      segments: [
        {
          id: "doc-s0",
          documentId: "doc",
          kind: "sentence",
          ordinal: 0,
          section: "Vitals",
          start: 0,
          end: 12,
          text: "Puls 72/min.",
          textEn: "Pulse 72/min.",
        },
      ],
    },
  ],
};
const candidate: ExtractedFact = {
  segmentId: "doc-s0",
  quote: "Puls 72/min.",
  kind: "measurement",
  labelEn: "Pulse 72/min",
  attrs: [{ key: "value", value: "72" }],
  assertion: "present",
  temporalStatus: "stated",
  eventDate: null,
  datePrecision: null,
  relativeDue: null,
};
const located = required(locatedFact(candidate, corpus.documents[0], () => {}));
const fact = rehash({ ...located, support: "supported" });
describe("ingest boundaries", () => {
  it("validates calendar dates with year and month precision", () => {
    expect(validEventDate("2024")).toBe(true);
    expect(validEventDate("2024-02")).toBe(true);
    expect(validEventDate("2024-02-29")).toBe(true);
    expect(validEventDate("2023-02-29")).toBe(false);
    expect(validEventDate("2024-13")).toBe(false);
    expect(validEventDate("20244-01-01")).toBe(false);
  });
  it("drops an unlocated number and an unknown segment", () => {
    expect(
      locatedFact({ ...candidate, labelEn: "Pulse 99/min" }, corpus.documents[0], () => {}),
    ).toBeNull();
    expect(
      locatedFact({ ...candidate, segmentId: "missing" }, corpus.documents[0], () => {}),
    ).toBeNull();
  });
  it("flags German concept negation before semantic adjudication", () => {
    expect(
      factNegationFlag({
        ...fact,
        quote: "Kein Hinweis auf Pneumonie.",
        attrs: { conceptDe: "Pneumonie" },
      }),
    ).toBe(true);
    expect(factNegationFlag({ ...fact, quote: "Kein Hinweis auf Pneumonie.", attrs: {} })).toBe(
      true,
    );
    expect(
      factNegationFlag({
        ...fact,
        assertion: "negated",
        quote: "Kein Hinweis auf Pneumonie.",
        attrs: {},
      }),
    ).toBe(false);
  });
  it("deduplicates normalized labels only within the same segment and kind", () => {
    expect(
      dedupeFacts([
        fact,
        { ...fact, labelEn: "  PULSE  72/MIN  " },
        { ...fact, segmentId: "another" },
        { ...fact, kind: "event" },
      ]),
    ).toHaveLength(3);
  });
  it("retries one transient model failure while preserving permanent failures", async () => {
    let attempts = 0;
    expect(
      await withTransientRetry(async () => {
        if (++attempts === 1) throw new Error("LLM 408: timeout");
        return "ok";
      }),
    ).toBe("ok");
    expect(attempts).toBe(2);
    attempts = 0;
    await expect(
      withTransientRetry(async () => {
        attempts++;
        throw new Error("LLM 401: denied");
      }),
    ).rejects.toThrow("401");
    expect(attempts).toBe(1);
  });
  it("bounds concurrency and preserves input ordering", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapBounded(
      [1, 2, 3, 4, 5],
      async (value) => {
        active++;
        peak = Math.max(active, peak);
        await Promise.resolve();
        active--;
        return value * 2;
      },
      2,
    );
    expect(peak).toBe(2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(chunks([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(() => chunks([1], 0)).toThrow();
  });
  it("stops scheduling batches after a worker fails", async () => {
    const visited: number[] = [];
    await expect(
      mapBounded(
        [1, 2, 3, 4],
        async (value) => {
          visited.push(value);
          if (value === 1) throw new Error("failed");
          await Promise.resolve();
          return value;
        },
        2,
      ),
    ).rejects.toThrow("failed");
    expect(visited).not.toContain(3);
    expect(visited).not.toContain(4);
  });
  it("plans deletes before inserts in FK order and preserves review/letter tables", () => {
    process.env.DATABASE_URL ??= "postgresql://synthetic:synthetic@localhost/synthetic";
    const queries = buildWriteQueries(getDb(), corpus, [], [fact]);
    const sql = queries.map(
      (query) =>
        (
          query as unknown as {
            toSQL(): {
              sql: string;
            };
          }
        ).toSQL().sql,
    );
    expect(sql.slice(0, 9).map((query) => query.match(/^delete from "([^"]+)"/)?.[1])).toEqual([
      "finding_passages",
      "findings",
      "facts",
      "entities",
      "segments",
      "documents",
      "validations",
      "lens_cache",
      "corpus_revisions",
    ]);
    expect(sql[9]).toContain('insert into "corpus_revisions"');
    expect(sql.at(-1)).toContain('insert into "facts"');
    expect(DELETE_ORDER).not.toContain("reviews");
    expect(DELETE_ORDER).not.toContain("letters");
    expect(() => buildWriteQueries(getDb(), corpus, [], [{ ...fact, quote: "elsewhere" }])).toThrow(
      "Invalid fact passage",
    );
    expect(() =>
      buildWriteQueries(getDb(), corpus, [], [{ ...fact, support: "unsupported" }]),
    ).toThrow("Unvalidated fact");
    expect(() => buildWriteQueries(getDb(), corpus, [], [{ ...fact, labelEn: "changed" }])).toThrow(
      "Stale fact identity",
    );
  });
  it("ignores annotation markup and spacing differences in reference concepts", () => {
    const hint: ConceptHint = {
      source: "medication",
      documentId: "doc",
      name: "Example tablet",
      text: '<span class="annotation">Example</span> 50 mg',
      value: null,
      unit: null,
      code: null,
    };
    expect(hintCovered(hint, [{ ...fact, kind: "medication", quote: "Example 50mg oral" }])).toBe(
      true,
    );
    expect(
      hintCovered({ ...hint, text: "Example 5 mg" }, [
        { ...fact, kind: "medication", quote: "Example 0.5mg oral" },
      ]),
    ).toBe(false);
    expect(
      hintCovered({ ...hint, text: "Example 75 mg" }, [
        { ...fact, kind: "medication", quote: "Example 50mg oral" },
      ]),
    ).toBe(false);
  });
  it("compares height units without modifying the source fact", () => {
    const hint: ConceptHint = {
      source: "scores-all",
      documentId: "doc",
      name: "Größe",
      text: "Größe",
      value: "1,7",
      unit: "m",
      code: null,
    };
    const height = {
      ...fact,
      labelEn: "Height",
      attrs: { value: "170", unit: "cm" },
      quote: "Größe 170 cm",
    };
    expect(hintCovered(hint, [height])).toBe(true);
    expect(hintCovered({ ...hint, value: "1,71" }, [height])).toBe(false);
    expect(height.attrs).toEqual({ value: "170", unit: "cm" });
  });
  it("requires a score value and concept in the same document", () => {
    const hint: ConceptHint = {
      source: "scores-all",
      documentId: "doc",
      name: "Herzfrequenz",
      text: "Herzfrequenz",
      value: "72",
      unit: "/min",
      code: null,
    };
    expect(conceptCoverage([hint], [fact]).percentage).toBe(100);
    expect(conceptCoverage([{ ...hint, documentId: "other" }], [fact]).percentage).toBe(0);
    expect(conceptCoverage([{ ...hint, name: "Gewicht" }], [fact]).percentage).toBe(0);
  });
});
