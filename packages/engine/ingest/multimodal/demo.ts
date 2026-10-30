import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { Fact } from "../../contracts.ts";
import { getDb } from "../../db/client.ts";
import { evidenceWindow, loadFacts } from "../../store.ts";
import { loadCorpus } from "../corpus.ts";
import { mapBounded } from "../extract.ts";
import { loadConceptHints } from "../recall.ts";
import { assertNewPatient, writeMultimodalCorpus } from "./assets.ts";
import { ocrPage } from "./ocr.ts";
import { factOverlap } from "./overlap.ts";
import { extractDocumentFacts, makeCorpus, prepareCorpus } from "./pipeline.ts";
import { REPO_ROOT, rasterise } from "./rasterise.ts";
import { toDocument } from "./to-document.ts";

const exec = promisify(execFile);

export async function compareCorpus(options: {
  data: string;
  patientId: string;
  scan?: boolean;
  persist?: boolean;
  baselinePatientId?: string;
  baselineFacts?: string;
  pdfDirectory?: string;
}) {
  const started = performance.now();
  const original = loadCorpus(options.data);
  const hasHints = ["diagnoses", "procedures", "medication", "scores-all"].every((source) =>
    existsSync(path.resolve(REPO_ROOT, options.data, `${source}.json`)),
  );
  const hints = hasHints ? loadConceptHints(options.data) : [];
  const convertedHints = hints.map((hint) => ({
    ...hint,
    documentId: `${options.patientId}-${hint.documentId}`,
  }));
  const directory = await mkdtemp("/private/tmp/medlyn-roundtrip-");
  if (!options.pdfDirectory)
    await exec(
      "uv",
      [
        "run",
        "--no-sync",
        "--project",
        path.join(REPO_ROOT, "ml"),
        "python",
        "-m",
        "multimodal.render_corpus",
        "--data",
        path.resolve(REPO_ROOT, options.data),
        "--out",
        directory,
        ...(options.scan ? ["--scan"] : []),
      ],
      {
        cwd: path.join(REPO_ROOT, "ml"),
        timeout: 120_000,
        env: {
          ...process.env,
          UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? "/private/tmp/medlyn-uv-cache",
        },
      },
    );
  const timings: object[] = [];
  const converted = await mapBounded(
    original.documents,
    async (source) => {
      const suffix = options.pdfDirectory && options.scan ? "-scan.pdf" : ".pdf";
      const pdf = path.join(options.pdfDirectory ?? directory, `${source.doc.id}${suffix}`);
      const raster = await rasterise(pdf);
      const results = await mapBounded(raster.pages, (page) => ocrPage(page), 2);
      for (const result of results)
        if (result.timing) {
          timings.push({ documentId: source.doc.id, ...result.timing });
          console.log(
            JSON.stringify({
              type: "ocr_page",
              documentId: source.doc.id,
              ...result.timing,
            }),
          );
        }
      return toDocument(
        results.map((result) => result.page),
        {
          id: `${options.patientId}-${source.doc.id}`,
          patientId: options.patientId,
          date: source.doc.docDate,
          title: source.doc.title,
          type: source.doc.docType,
          department: source.doc.department,
        },
      );
    },
    2,
  );
  await writeFile(path.join(directory, "converted.json"), JSON.stringify(converted));
  const baseline = options.baselineFacts
    ? Fact.array().parse(JSON.parse(await readFile(options.baselineFacts, "utf8")))
    : options.baselinePatientId
      ? await loadFacts(
          await evidenceWindow(undefined, options.baselinePatientId),
          undefined,
          options.baselinePatientId,
        )
      : await extractDocumentFacts(original.documents, undefined, hints);
  if (!baseline.length) throw new Error("No baseline facts; cannot measure overlap");
  await writeFile(path.join(directory, "baseline-facts.json"), JSON.stringify(baseline));
  const corpus = options.persist
    ? makeCorpus(
        converted.map((result) => result.document),
        options.patientId,
      )
    : null;
  const documents = corpus?.documents ?? converted.map((result) => result.document);
  const candidate = await extractDocumentFacts(documents, undefined, convertedHints);
  await writeFile(path.join(directory, "candidate-facts.json"), JSON.stringify(candidate));
  const overlap = factOverlap(baseline, candidate);
  const textMatchedDocuments = converted.filter(
    (item, index) =>
      item.document.normText.replace(/\s/g, "") ===
      original.documents[index].normText.replace(/\s/g, ""),
  ).length;
  const summary = {
    patientId: options.patientId,
    scan: options.scan ?? false,
    documents: documents.length,
    pages: converted.reduce((count, item) => count + item.pages.length, 0),
    baselineFacts: baseline.length,
    candidateFacts: candidate.length,
    textMatchedDocuments,
    overlap,
    ocr: timings,
    durationMs: Math.round(performance.now() - started),
    directory,
    persisted: false,
  };
  await writeFile(path.join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  if (corpus) {
    await assertNewPatient(
      getDb(),
      options.patientId,
      documents.map((document) => document.doc.id),
    );
    const prepared = await prepareCorpus(corpus, undefined, convertedHints);
    await writeMultimodalCorpus(
      getDb(),
      prepared.corpus,
      prepared.entities,
      prepared.facts,
      converted,
    );
    summary.persisted = true;
    summary.durationMs = Math.round(performance.now() - started);
    await writeFile(path.join(directory, "summary.json"), JSON.stringify(summary, null, 2));
  }
  console.log(
    JSON.stringify({
      type: "roundtrip_summary",
      ...summary,
      overlap: {
        ...overlap,
        missing: overlap.missing.length,
        extra: overlap.extra.length,
      },
    }),
  );
  return summary;
}

async function main(args: string[]) {
  const values: Record<string, string> = {};
  const valuedOptions = new Set([
    "--data",
    "--patient",
    "--baseline-patient",
    "--baseline-facts",
    "--pdf-dir",
  ]);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--scan" || arg === "--persist") values[arg] = "true";
    else if (valuedOptions.has(arg) && args[index + 1]) {
      values[arg] = args[++index];
    } else throw new Error(`Invalid demo argument: ${arg}`);
  }
  const data = values["--data"] ?? process.env.MEDLYN_DATA_PATH;
  if (!data || !values["--patient"]) throw new Error("--data and --patient are required");
  await compareCorpus({
    data,
    patientId: values["--patient"],
    scan: values["--scan"] === "true",
    persist: values["--persist"] === "true",
    baselinePatientId: values["--baseline-patient"],
    baselineFacts: values["--baseline-facts"],
    pdfDirectory: values["--pdf-dir"],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "PDF round-trip failed");
    process.exitCode = 1;
  });
}
