import { createInterface } from "node:readline";
import { codeCheck } from "../../packages/engine/claims/code-check.ts";
import type { Fact } from "../../packages/engine/contracts.ts";
import { normalise } from "../../packages/engine/ingest/normalise.ts";
import { segment } from "../../packages/engine/ingest/segment.ts";
import { factLineText } from "../../packages/engine/lens/templates.ts";

type BridgeInput =
  | { op: "rules"; claim: string; sources: string[] }
  | { op: "real" | "real-facts" }
  | {
      op: "patient";
      row: {
        documents: {
          text: string;
          metadata: { id: string; date?: string; docDate?: string; rewritten?: boolean };
        }[];
        labels: { facts: Omit<Fact, "docDate">[] };
      };
    };

async function dispatch(input: BridgeInput) {
  if (input.op === "rules") return codeCheck(input.claim, input.sources);
  if (input.op === "patient") {
    const documents = input.row.documents.map((document) => {
      const text = normalise(document.text).text;
      return { ...document.metadata, text, segments: segment(text) };
    });
    const facts = input.row.labels.facts.map((fact) => {
      const document = documents.find((doc) => doc.id === fact.documentId);
      const attrs = { ...fact.attrs };
      if (attrs.side === "links") attrs.side = "left";
      if (attrs.side === "rechts") attrs.side = "right";
      if (attrs.listLabel === "Entlassungsmedikation") attrs.listLabel = "Discharge medication";
      return {
        ...fact,
        attrs,
        claim: factLineText({
          ...fact,
          attrs,
          docDate: document?.date ?? document?.docDate,
        } as Fact),
      };
    });
    return { documents, facts };
  }
  if (input.op === "real-facts") {
    const { loadCorpus } = await import("../../packages/engine/ingest/corpus.ts");
    const { evidenceWindow, loadEvidence, PATIENT_ID } = await import(
      "../../packages/engine/store.ts"
    );
    const corpus = loadCorpus();
    const window = await evidenceWindow(undefined, PATIENT_ID);
    if (corpus.revisionId !== window.corpusRevision)
      throw new Error("Local corpus and DB revision differ");
    const evidence = await loadEvidence(window, PATIENT_ID);
    const documents = evidence.documents.map((document) => ({
      id: document.id,
      text: document.normText,
      date: document.docDate,
      segments: evidence.segments.filter((item) => item.documentId === document.id),
    }));
    const facts = evidence.facts
      .filter((fact) => fact.locationOk && fact.support === "supported")
      .map((fact) => ({ ...fact, claim: factLineText(fact) }));
    return { patientId: PATIENT_ID, window, documents, facts };
  }
  if (input.op === "real") {
    const { getDb } = await import("../../packages/engine/db/client.ts");
    const { letters, documents, validations } = await import("../../packages/engine/db/schema.ts");
    const { PATIENT_ID } = await import("../../packages/engine/store.ts");
    const db = getDb();
    // Read only. Cache rows contain no text, so letters are the recoverable claim source.
    const [letterRows, documentRows, validationRows] = await Promise.all([
      db.select().from(letters),
      db.select().from(documents),
      db.select().from(validations),
    ]);
    return {
      patientId: PATIENT_ID,
      letters: letterRows.filter((row) => row.patientId === PATIENT_ID),
      documents: documentRows
        .filter((row) => row.patientId === PATIENT_ID)
        .map((row) => ({
          id: row.id,
          date: row.docDate,
          revisionId: row.revisionId,
          segments: segment(row.normText).map((item) => ({
            ...item,
            id: `${row.id}-s${item.ordinal}`,
          })),
        })),
      validations: validationRows.filter((row) => row.patientId === PATIENT_ID),
    };
  }
  throw new Error("Unknown bridge operation");
}

for await (const line of createInterface({ input: process.stdin })) {
  try {
    process.stdout.write(`${JSON.stringify({ result: await dispatch(JSON.parse(line)) })}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`,
    );
  }
}
