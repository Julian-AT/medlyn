import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Fact } from "../contracts.ts";
import type { Db } from "../db/client.ts";
import * as t from "../db/schema.ts";
import type { Corpus } from "./corpus.ts";
import type { IngestEntity } from "./entities.ts";
import { chunks } from "./semantic.ts";
import { contentHash, factId } from "./hash.ts";

export const DELETE_ORDER = ["findingPassages", "findings", "facts", "entities", "segments", "documents", "validations", "lensCache", "corpusRevisions"] as const;

/** Build one atomic Neon batch; reviews and letters are intentionally outside the corpus. */
export function buildWriteQueries(db: Db, corpus: Corpus, entities: IngestEntity[], facts: Fact[]): [BatchItem<"pg">, ...BatchItem<"pg">[]] {
  const patientId = corpus.patient.id;
  const queries: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [db.delete(t.findingPassages).where(eq(t.findingPassages.patientId, patientId))];
  for (const name of DELETE_ORDER.slice(1)) queries.push(db.delete(t[name]).where(eq(t[name].patientId, patientId)));
  queries.push(db.insert(t.corpusRevisions).values({ id: corpus.revisionId, patientId, documentsHash: corpus.documentsHash }));
  for (const batch of chunks(corpus.documents, 200)) queries.push(db.insert(t.documents).values(batch.map((cd) => ({ ...cd.doc, patientId, revisionId: corpus.revisionId, rawText: cd.rawText, normText: cd.normText, offsetMap: cd.offsetMap }))));
  for (const batch of chunks(corpus.documents.flatMap((cd) => cd.segments), 200)) queries.push(db.insert(t.segments).values(batch.map((s) => ({ ...s, patientId }))));
  for (const batch of chunks(entities, 200)) queries.push(db.insert(t.entities).values(batch.map((e) => ({ ...e, patientId }))));
  const segments = new Map(corpus.documents.flatMap((cd) => cd.segments).map((s) => [s.id, s]));
  const ids = new Set<string>();
  const entityIds = new Set(entities.map((entity) => entity.id));
  const documents = new Map(corpus.documents.map((cd) => [cd.doc.id, cd.doc]));
  for (const fact of facts) {
    const segment = segments.get(fact.segmentId);
    if (fact.entityId && !entityIds.has(fact.entityId)) throw new Error(`Unknown fact entity: ${fact.id}`);
    if (segment?.documentId !== fact.documentId || documents.get(fact.documentId)?.docDate !== fact.docDate) throw new Error(`Invalid fact document: ${fact.id}`);
    if (!fact.locationOk || !["supported", "partial"].includes(fact.support)) throw new Error(`Unvalidated fact: ${fact.id}`);
    if (!segment || fact.start < segment.start || fact.end > segment.end || segment.text.slice(fact.start - segment.start, fact.end - segment.start) !== fact.quote) throw new Error(`Invalid fact passage: ${fact.id}`);
    if (contentHash(fact) !== fact.contentHash || fact.id !== factId(fact.contentHash)) throw new Error(`Stale fact identity: ${fact.id}`);
    if (ids.has(fact.id)) throw new Error(`Duplicate fact: ${fact.id}`);
    ids.add(fact.id);
  }
  for (const batch of chunks(facts, 200)) queries.push(db.insert(t.facts).values(batch.map((f) => ({ ...f, patientId }))));
  return queries;
}

export async function writeCorpus(db: Db, corpus: Corpus, entities: IngestEntity[], facts: Fact[]): Promise<void> {
  await db.batch(buildWriteQueries(db, corpus, entities, facts));
}
