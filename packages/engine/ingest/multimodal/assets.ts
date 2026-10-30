import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { eq, inArray } from "drizzle-orm";
import type { Fact } from "../../contracts.ts";
import type { Db } from "../../db/client.ts";
import * as tables from "../../db/schema.ts";
import { embed } from "../../search/embed.ts";
import type { Corpus } from "../corpus.ts";
import type { IngestEntity } from "../entities.ts";
import { chunks } from "../semantic.ts";
import { buildWriteQueries } from "../write.ts";
import type { ConvertedDocument } from "./to-document.ts";

/** Images and their embeddings are retrieval assets; text offsets remain the sole fact evidence. */
export async function pageAssetRows(documents: ConvertedDocument[]) {
  const inputs = documents.flatMap((document) =>
    document.pages.map((page) => ({ document, page })),
  );
  const embeddings = process.env.GEMINI_API_KEY
    ? await embed(
        await Promise.all(
          inputs.map(async ({ page }) => ({
            parts: [
              {
                inlineData: {
                  mimeType: "image/png" as const,
                  data: (await readFile(page.imagePath)).toString("base64"),
                },
              },
            ],
          })),
        ),
      )
    : null;
  return inputs.map(({ document, page }, index): typeof tables.pageAssets.$inferInsert => ({
    id: `${document.document.doc.id}-p${page.page}`,
    patientId: document.document.doc.patientId,
    documentId: document.document.doc.id,
    page: page.page,
    kind: "page_png",
    uri: pathToFileURL(page.imagePath).href,
    ocrText: page.lines.map((line) => line.text).join("\n"),
    bbox: {
      version: 1,
      width: page.width,
      height: page.height,
      dpi: page.dpi,
      source: page.source,
      coordinateSpace: "normalised",
      passages: document.passages.filter((passage) => passage.page === page.page),
      lines: page.lines,
    },
    embedding: embeddings?.[index] ?? null,
  }));
}

export async function assertNewPatient(
  db: Db,
  patientId: string,
  documentIds: string[],
): Promise<void> {
  const existing = await db
    .select({ id: tables.documents.id })
    .from(tables.documents)
    .where(eq(tables.documents.patientId, patientId))
    .limit(1);
  if (existing.length) {
    throw new Error(`Patient ${patientId} already has documents; use a new demo patient id`);
  }
  const collisions = await db
    .select({ id: tables.documents.id })
    .from(tables.documents)
    .where(inArray(tables.documents.id, documentIds))
    .limit(1);
  if (collisions.length) {
    throw new Error(`Document id already exists: ${collisions[0].id}; use a patient prefix`);
  }
}

/** One Neon transaction persists the located facts and corresponding page assets together. */
export async function writeMultimodalCorpus(
  db: Db,
  corpus: Corpus,
  entities: IngestEntity[],
  facts: Fact[],
  documents: ConvertedDocument[],
): Promise<void> {
  const assets = await pageAssetRows(documents);
  const queries = buildWriteQueries(db, corpus, entities, facts);
  queries.unshift(
    db.delete(tables.pageAssets).where(eq(tables.pageAssets.patientId, corpus.patient.id)),
  );
  for (const batch of chunks(assets, 50)) queries.push(db.insert(tables.pageAssets).values(batch));
  await db.batch(queries);
}
