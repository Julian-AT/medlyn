import { asc, eq } from "drizzle-orm";
import { DocumentView, PassageView } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import * as t from "../db/schema.ts";

/** Evidence navigation uses explicit ids, independently of the active lens window. */
export async function getDocument(documentId: string): Promise<DocumentView> {
  const db = getDb();
  const [documents, segments] = await Promise.all([
    db.select().from(t.documents).where(eq(t.documents.id, documentId)).limit(1),
    db
      .select()
      .from(t.segments)
      .where(eq(t.segments.documentId, documentId))
      .orderBy(asc(t.segments.ordinal)),
  ]);
  if (!documents[0]) throw new Error(`Document not found: ${documentId}`);
  return DocumentView.parse({ document: documents[0], segments });
}

export function passageContext(document: DocumentView, segmentId: string): PassageView {
  const index = document.segments.findIndex((segment) => segment.id === segmentId);
  if (index < 0) throw new Error(`Segment not found: ${segmentId}`);
  return PassageView.parse({
    document: document.document,
    segment: document.segments[index],
    before: document.segments.slice(Math.max(0, index - 2), index),
    after: document.segments.slice(index + 1, index + 3),
  });
}

export async function getPassage(segmentId: string): Promise<PassageView> {
  const [segment] = await getDb()
    .select({ documentId: t.segments.documentId })
    .from(t.segments)
    .where(eq(t.segments.id, segmentId))
    .limit(1);
  if (!segment) throw new Error(`Segment not found: ${segmentId}`);
  return passageContext(await getDocument(segment.documentId), segmentId);
}
