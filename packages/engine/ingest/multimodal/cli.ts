import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { getDb } from "../../db/client.ts";
import { computeFindings, storeFindings } from "../../findings/index.ts";
import { PATIENT_ID } from "../../store.ts";
import { mapBounded } from "../extract.ts";
import { assertNewPatient, writeMultimodalCorpus } from "./assets.ts";
import { ocrPage } from "./ocr.ts";
import { makeCorpus, prepareCorpus } from "./pipeline.ts";
import { rasterise } from "./rasterise.ts";
import { toDocument } from "./to-document.ts";

export function parseArgs(args: string[]) {
  const values: Record<string, string> = {};
  let dryRun = false;
  const keys = new Set(["pdf", "patient", "doc-id", "date", "title", "type", "department"]);
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--dry-run") {
      dryRun = true;
      continue;
    }
    const key = args[index].slice(2);
    if (
      !args[index].startsWith("--") ||
      !keys.has(key) ||
      !args[index + 1] ||
      args[index + 1].startsWith("--") ||
      key in values
    ) {
      throw new Error(`Unknown, duplicate or incomplete argument: ${args[index]}`);
    }
    values[key] = args[++index];
  }
  for (const key of ["pdf", "patient", "doc-id", "date", "title"]) {
    if (!values[key]?.trim()) throw new Error(`Missing --${key}`);
  }
  if (values.patient === PATIENT_ID) throw new Error("Use a separate patient id for PDF ingestion");
  return {
    pdf: values.pdf,
    dryRun,
    metadata: {
      id: values["doc-id"],
      patientId: values.patient,
      date: values.date,
      title: values.title,
      type: values.type,
      department: values.department,
    },
  };
}

export async function main(args = process.argv.slice(2)) {
  const { pdf, metadata, dryRun } = parseArgs(args);
  const started = performance.now();
  if (!dryRun) await assertNewPatient(getDb(), metadata.patientId, [metadata.id]);
  const raster = await rasterise(pdf);
  const results = await mapBounded(raster.pages, (page) => ocrPage(page), 2);
  const converted = toDocument(
    results.map((result) => result.page),
    metadata,
  );
  const timings = results.flatMap((result) => (result.timing ? [result.timing] : []));
  await writeFile(`${raster.directory}/document.json`, JSON.stringify(converted));
  for (const timing of timings) console.log(JSON.stringify({ type: "ocr_page", ...timing }));
  const prepared = await prepareCorpus(makeCorpus([converted.document], metadata.patientId));
  if (!dryRun) {
    const findings = await computeFindings({
      documents: prepared.corpus.documents,
      facts: prepared.facts,
    });
    await writeMultimodalCorpus(getDb(), prepared.corpus, prepared.entities, prepared.facts, [
      converted,
    ]);
    await storeFindings(getDb(), metadata.patientId, prepared.corpus.revisionId, findings);
  }
  await writeFile(`${raster.directory}/facts.json`, JSON.stringify(prepared.facts));
  const summary = {
    type: "multimodal_ingest",
    patientId: metadata.patientId,
    documentId: metadata.id,
    pages: results.length,
    ocrPages: timings.length,
    facts: prepared.facts.length,
    directory: raster.directory,
    dryRun,
    durationMs: Math.round(performance.now() - started),
  };
  console.log(JSON.stringify(summary));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "PDF ingestion failed");
    process.exitCode = 1;
  });
}
