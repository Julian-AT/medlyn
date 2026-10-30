import { sql } from "drizzle-orm";
import type { Segment } from "../contracts.ts";
import type { Db } from "../db/client.ts";
import { segmentEmbeddings } from "../db/schema.ts";
import { EMBEDDING_DIM, EMBEDDING_MODEL, embed } from "../search/embed.ts";

type EmbeddingCorpus = {
  patient: { id: string };
  documents: { doc: { titleEn: string }; segments: Pick<Segment, "id" | "text" | "textEn">[] }[];
};

/** Embed translated segments after corpus storage; missing credentials leave lexical retrieval available. */
export async function embedCorpus(
  db: Db,
  corpus: EmbeddingCorpus,
): Promise<{ embedded: number; skipped: boolean }> {
  const segments = corpus.documents.flatMap(({ doc, segments }) =>
    segments.map((segment) => ({
      segmentId: segment.id,
      input: { title: doc.titleEn, parts: [{ text: `${segment.text}\n${segment.textEn ?? ""}` }] },
    })),
  );
  const vectors = await embed(segments.map(({ input }) => input)).catch((error: unknown) => {
    console.warn("embedding_unavailable", {
      patientId: corpus.patient.id,
      reason: error instanceof Error ? error.message : "Embedding failed",
      fallback: "BM25-only search",
    });
    return null;
  });
  if (!vectors) return { embedded: 0, skipped: true };
  for (let start = 0; start < segments.length; start += 100) {
    await db
      .insert(segmentEmbeddings)
      .values(
        segments.slice(start, start + 100).map((segment, index) => ({
          segmentId: segment.segmentId,
          patientId: corpus.patient.id,
          model: EMBEDDING_MODEL,
          dim: EMBEDDING_DIM,
          embedding: vectors[start + index],
        })),
      )
      .onConflictDoUpdate({
        target: segmentEmbeddings.segmentId,
        set: {
          model: sql`excluded.model`,
          dim: sql`excluded.dim`,
          patientId: sql`excluded.patient_id`,
          embedding: sql`excluded.embedding`,
        },
      });
  }
  console.info("segments_embedded", { patientId: corpus.patient.id, count: segments.length });
  return { embedded: segments.length, skipped: false };
}
