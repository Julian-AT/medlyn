import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Document, EvidenceWindow, Fact, FactKind, Finding, Segment } from "./contracts.ts";
import { getDb } from "./db/client.ts";
import * as t from "./db/schema.ts";

export const PATIENT_ID = "patient-0000-0001";

export async function currentRevision(patientId = PATIENT_ID): Promise<string> {
  const [row] = await getDb()
    .select({ id: t.corpusRevisions.id })
    .from(t.corpusRevisions)
    .where(eq(t.corpusRevisions.patientId, patientId))
    .orderBy(desc(t.corpusRevisions.createdAt))
    .limit(1);
  if (!row) throw new Error(`No corpus revision for ${patientId}; run pnpm ingest`);
  return row.id;
}

/** The one evidence window (invariant 5): eligible means doc_date <= asOf. Default asOf is the latest document date. */
export async function evidenceWindow(asOf?: string, patientId = PATIENT_ID): Promise<EvidenceWindow> {
  const revision = await currentRevision(patientId);
  const docs = await getDb()
    .select({ id: t.documents.id, docDate: t.documents.docDate })
    .from(t.documents)
    .where(and(eq(t.documents.patientId, patientId), eq(t.documents.revisionId, revision)))
    .orderBy(asc(t.documents.docDate));
  const effective = asOf ?? docs.at(-1)!.docDate;
  return {
    asOf: effective,
    eligibleDocumentIds: docs.filter((d) => d.docDate <= effective).map((d) => d.id),
    corpusRevision: revision,
  };
}

export async function documentCount(patientId = PATIENT_ID): Promise<number> {
  const revision = await currentRevision(patientId);
  return (
    await getDb()
      .select({ id: t.documents.id })
      .from(t.documents)
      .where(and(eq(t.documents.patientId, patientId), eq(t.documents.revisionId, revision)))
  ).length;
}

export async function loadDocuments(window: EvidenceWindow): Promise<(Document & { normText: string })[]> {
  if (!window.eligibleDocumentIds.length) return [];
  const rows = await getDb()
    .select()
    .from(t.documents)
    .where(inArray(t.documents.id, window.eligibleDocumentIds))
    .orderBy(asc(t.documents.docDate));
  return rows.map(({ rawText, offsetMap, ...doc }) => doc);
}

export async function loadSegments(window: EvidenceWindow): Promise<Segment[]> {
  if (!window.eligibleDocumentIds.length) return [];
  const rows = await getDb()
    .select()
    .from(t.segments)
    .where(inArray(t.segments.documentId, window.eligibleDocumentIds))
    .orderBy(asc(t.segments.documentId), asc(t.segments.ordinal));
  return rows.map(({ patientId, ordinal, ...segment }) => segment);
}

export async function loadFacts(window: EvidenceWindow, kinds?: FactKind[]): Promise<Fact[]> {
  if (!window.eligibleDocumentIds.length) return [];
  const rows = await getDb()
    .select()
    .from(t.facts)
    .where(
      and(
        inArray(t.facts.documentId, window.eligibleDocumentIds),
        eq(t.facts.locationOk, true),
        kinds?.length ? inArray(t.facts.kind, kinds) : undefined,
      ),
    );
  return rows.map(({ patientId, ...fact }) => ({ ...fact, locationOk: true }) as Fact);
}

/** Findings are computed once at ingest; one is shown only when every passage is eligible. */
export async function loadFindings(window: EvidenceWindow, patientId = PATIENT_ID): Promise<Finding[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(t.findings)
    .where(
      and(
        eq(t.findings.patientId, patientId),
        eq(t.findings.revisionId, window.corpusRevision),
        inArray(t.findings.type, ["contradiction", "needs_clarification"]),
      ),
    );
  if (!rows.length) return [];
  const passages = await db
    .select({ p: t.findingPassages, documentId: t.segments.documentId })
    .from(t.findingPassages)
    .innerJoin(t.segments, eq(t.findingPassages.segmentId, t.segments.id))
    .where(inArray(t.findingPassages.findingId, rows.map((r) => r.id)));
  const eligible = new Set(window.eligibleDocumentIds);
  return rows
    .map((f) => ({
      id: f.id,
      type: f.type as Finding["type"],
      title: f.title,
      explanation: f.explanation,
      severity: f.severity,
      computation: f.computation,
      hypothesisText: f.hypothesisText,
      passages: passages
        .filter(({ p }) => p.findingId === f.id)
        .map(({ p, documentId }) => ({
          segmentId: p.segmentId,
          documentId,
          factId: p.factId,
          quote: p.quote,
          start: p.start,
          end: p.end,
          claimEn: p.claimEn,
        })),
    }))
    .filter((f) => f.passages.length >= 2 && f.passages.every((p) => eligible.has(p.documentId)));
}

export async function latestDocDate(patientId = PATIENT_ID): Promise<string> {
  return (await evidenceWindow(undefined, patientId)).asOf;
}
