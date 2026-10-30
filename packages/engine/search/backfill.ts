import { pathToFileURL } from "node:url";
import { getDb } from "../db/client.ts";
import { embedCorpus } from "../ingest/embed-step.ts";
import { evidenceWindow, loadDocuments, loadSegments, PATIENT_ID } from "../store.ts";

export async function backfillEmbeddings(patientId = PATIENT_ID) {
  const window = await evidenceWindow(undefined, patientId);
  const [documents, segments] = await Promise.all([
    loadDocuments(window, patientId), loadSegments(window, patientId),
  ]);
  return embedCorpus(getDb(), {
    patient: { id: patientId },
    documents: documents.map((doc) => ({
      doc,
      segments: segments.filter((segment) => segment.documentId === doc.id),
    })),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backfillEmbeddings(process.argv[2]).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
