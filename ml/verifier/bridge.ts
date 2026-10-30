import { createInterface } from "node:readline";
import { normalise } from "../../packages/engine/ingest/normalise.ts";
import { segment } from "../../packages/engine/ingest/segment.ts";
import { factLineText } from "../../packages/engine/lens/templates.ts";
import { codeCheck } from "../../packages/engine/claims/code-check.ts";
import type { Fact } from "../../packages/engine/contracts.ts";

async function dispatch(input: Record<string, any>) {
  if (input.op === "rules") return codeCheck(input.claim, input.sources);
  if (input.op === "patient") {
    const documents = input.row.documents.map((document: any) => {
      const text = normalise(document.text).text;
      return { ...document.metadata, text, segments: segment(text) };
    });
    const facts = input.row.labels.facts.map((fact: any) => {
      const document = documents.find((doc: any) => doc.id === fact.documentId);
      const attrs = { ...fact.attrs };
      if (attrs.side === "links") attrs.side = "left";
      if (attrs.side === "rechts") attrs.side = "right";
      if (attrs.listLabel === "Entlassungsmedikation") attrs.listLabel = "Discharge medication";
      return { ...fact, attrs, claim: factLineText({ ...fact, attrs,
        docDate: document?.date ?? document?.docDate,
      } as Fact) };
    });
    return { documents, facts };
  }
  if (input.op === "real") {
    const { getDb } = await import("../../packages/engine/db/client.ts");
    const { letters, documents, validations } = await import("../../packages/engine/db/schema.ts");
    const { PATIENT_ID } = await import("../../packages/engine/store.ts");
    const db = getDb();
    // Read only. Cache rows contain no text, so letters are the recoverable claim source.
    const [letterRows, documentRows, validationRows] = await Promise.all([
      db.select().from(letters), db.select().from(documents), db.select().from(validations),
    ]);
    return {
      patientId: PATIENT_ID,
      letters: letterRows.filter((row) => row.patientId === PATIENT_ID),
      documents: documentRows.filter((row) => row.patientId === PATIENT_ID).map((row) => ({
        id: row.id, date: row.docDate, revisionId: row.revisionId,
        segments: segment(row.normText).map((item) => ({ ...item, id: `${row.id}-s${item.ordinal}` })),
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
    process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
  }
}
