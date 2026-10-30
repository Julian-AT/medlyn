import { drizzle } from "drizzle-orm/neon-http";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../db/client.ts";
import * as schema from "../db/schema.ts";
import type { EvidenceWindow } from "../contracts.ts";
import { assertWindowCurrent, loadDocuments, loadFacts, loadFindings, loadSegments, PATIENT_ID } from "../store.ts";
import { computeFindings } from "../findings/index.ts";
import type { FindingRecord } from "../findings/types.ts";
import { segment } from "../ingest/segment.ts";

let database: Db;
vi.mock("../db/client.ts", () => ({ getDb: () => database }));

const window: EvidenceWindow = { asOf: "2025-01-01", corpusRevision: "revision-old",
  eligibleDocumentIds: ["synthetic-doc"] };
let current = true;
let missing = false;
let replaceDuringRead = false;
let queries: { sql: string; params: unknown[] }[];
let findingData: FindingRecord | undefined;
let documentText: string;

beforeEach(() => {
  current = true;
  missing = false;
  replaceDuringRead = false;
  queries = [];
  findingData = undefined;
  documentText = "Synthetic evidence.";
  const client = async (sql: string, params: unknown[]) => {
    queries.push({ sql, params });
    if (sql.includes('from "corpus_revisions" left join')) {
      return { rows: current ? [[window.corpusRevision, missing ? null : "synthetic-doc"]] : [] };
    }
    if (replaceDuringRead) current = false;
    if (sql.includes('from "findings"') && findingData) {
      const finding = findingData;
      return { rows: [[finding.id, PATIENT_ID, window.corpusRevision, finding.type, finding.category,
        "Invented title", "Invented explanation", finding.severity, "Invented computation", "Invented hypothesis"]] };
    }
    if (sql.includes('from "finding_passages"') && findingData) {
      return { rows: findingData.passages.map((passage) => [findingData!.id, PATIENT_ID,
        passage.segmentId, passage.factId, passage.quote, passage.start, passage.end,
        "Invented English claim", passage.documentId]) };
    }
    if (sql.includes('from "segments"') && findingData) {
      return { rows: segment(documentText).map((item) => [`synthetic-doc-s${item.ordinal}`,
        PATIENT_ID, "synthetic-doc", item.kind, item.section, item.ordinal,
        item.start, item.end, item.text, null]) };
    }
    if (sql.includes('from "documents"')) {
      return { rows: [["synthetic-doc", PATIENT_ID, window.corpusRevision, "Synthetic", "Synthetic",
        "test", "2025-01-01", "Test", documentText, documentText, []]] };
    }
    return { rows: [] };
  };
  database = drizzle({ client: client as unknown as NeonQueryFunction<false, false>, schema });
});

describe("evidence revision reads", () => {
  it.each([loadDocuments, loadSegments, loadFacts, loadFindings])(
    "rejects a replaced revision before reading evidence (%#)", async (load) => {
      current = false;
      await expect(load(window)).rejects.toThrow("stale or incomplete");
      expect(queries).toHaveLength(1);
    },
  );

  it("rejects missing document ids and stale empty windows", async () => {
    missing = true;
    await expect(assertWindowCurrent(window)).rejects.toThrow("stale or incomplete");
    current = false;
    await expect(loadFacts({ ...window, eligibleDocumentIds: [] })).rejects.toThrow("stale or incomplete");
  });

  it.each([loadDocuments, loadSegments, loadFacts, loadFindings])(
    "rejects replacement between the evidence query and its return (%#)", async (load) => {
      replaceDuringRead = true;
      await expect(load(window)).rejects.toThrow("stale or incomplete");
    },
  );

  it("pins document, segment and fact reads through documents.revision_id", async () => {
    expect(await loadDocuments(window)).toHaveLength(1);
    expect(await loadSegments(window)).toEqual([]);
    expect(await loadFacts(window)).toEqual([]);
    const reads = queries.filter(({ sql }) => !sql.includes('from "corpus_revisions"'));
    expect(reads).toHaveLength(3);
    for (const { sql, params } of reads) {
      expect(sql).toMatch(/"documents"\."revision_id" = \$\d/);
      expect(params).toContain(window.corpusRevision);
    }
    expect(reads[1].sql).toContain('inner join "documents"');
    expect(reads[2].sql).toContain('inner join "documents"');
  });

  it("revalidates stored prose before returning a finding, including passage English", async () => {
    documentText = "Height: 182 cm\nWeight: 83 kg\nBMI: 31.2";
    const [original] = await computeFindings({ facts: [], documents: [{
      doc: { id: "synthetic-doc", patientId: PATIENT_ID, revisionId: window.corpusRevision,
        title: "Synthetic", titleEn: "Synthetic", docType: "test", docDate: window.asOf,
        department: "Test" }, rawText: documentText, normText: documentText, offsetMap: [],
      segments: segment(documentText).map((item) => ({ ...item,
        id: `synthetic-doc-s${item.ordinal}`, documentId: "synthetic-doc", textEn: null })),
    }] }, { llm: false });
    findingData = original;
    const [display] = await loadFindings(window);
    expect(display.title).toBe(original.title);
    expect(display.explanation).toBe(original.explanation);
    expect(display.computation).toBe(original.computation);
    expect(display.hypothesisText).toBeNull();
    expect(display.passages.map((passage) => passage.claimEn))
      .toEqual(original.passages.map((passage) => passage.claimEn));
    const passageQuery = queries.find(({ sql }) => sql.includes('from "finding_passages"'))!;
    expect(passageQuery.sql).toContain('inner join "documents"');
    expect(passageQuery.params).toContain(window.corpusRevision);
  });
});
