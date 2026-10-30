import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getDb } from "../db/client.ts";
import { loadCorpus } from "./corpus.ts";
import { conceptCoverage, printCoverage } from "./coverage.ts";
import { embedCorpus } from "./embed-step.ts";
import { clusterEntities } from "./entities.ts";
import { type DropLog, dedupeFacts, extractFacts, VALIDATOR_VERSION } from "./extract.ts";
import { parseMedicationTables } from "./medication.ts";
import { loadConceptHints, recallFacts } from "./recall.ts";
import { checkSemantics, normaliseFacts } from "./semantic.ts";
import { translateSegments } from "./translate.ts";
import { writeCorpus } from "./write.ts";

export function parseArgs(args: string[]) {
  let dataPath: string | undefined;
  let llmFindings = true;
  let warm = true;
  let embed = true;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--no-llm-findings") llmFindings = false;
    else if (arg === "--no-warm") warm = false;
    else if (arg === "--no-embed") embed = false;
    else if (arg === "--data" && args[index + 1] && !args[index + 1].startsWith("--"))
      dataPath = args[++index];
    else throw new Error(`Unknown or incomplete ingest argument: ${arg}`);
  }
  return { dataPath, llmFindings, warm, embed };
}

export async function ingest(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const started = performance.now();
  const corpus = loadCorpus(options.dataPath);
  const hints = loadConceptHints(options.dataPath);
  const dropped: Record<string, number> = {};
  const drop: DropLog = (entry) => {
    dropped[entry.reason] = (dropped[entry.reason] ?? 0) + 1;
    console.log(JSON.stringify({ type: "ingest_drop", ...entry }));
  };
  console.log(
    JSON.stringify({
      type: "ingest_start",
      revision: corpus.revisionId,
      documents: corpus.documents.length,
    }),
  );
  const translation = translateSegments(corpus.documents);
  // Observe rejection immediately while extraction is running in parallel.
  const translated = translation.then(
    (documents) => ({ documents, error: null }),
    (error: unknown) => ({ documents: null, error }),
  );
  const tableFacts = corpus.documents.flatMap((cd) => parseMedicationTables(cd, VALIDATOR_VERSION));
  const extracted = await extractFacts(corpus.documents, drop);
  console.log(
    JSON.stringify({
      type: "ingest_stage",
      stage: "extracted",
      facts: extracted.length,
      tableFacts: tableFacts.length,
    }),
  );
  const recalled = await recallFacts(corpus.documents, [...tableFacts, ...extracted], hints, drop);
  console.log(JSON.stringify({ type: "ingest_stage", stage: "recalled", facts: recalled.length }));
  let checked = await checkSemantics(corpus.documents, recalled, drop);
  for (let round = 1; round <= 2; round++) {
    const coverage = conceptCoverage(hints, checked);
    if (coverage.percentage >= 95) break;
    const missingDocuments = new Set(coverage.missing.map((hint) => hint.documentId));
    const before = new Set(checked.map((fact) => fact.id));
    const recovered = await recallFacts(
      corpus.documents.filter((cd) => missingDocuments.has(cd.doc.id)),
      checked,
      coverage.missing,
      drop,
    );
    const additions = recovered.filter((fact) => !before.has(fact.id));
    if (!additions.length) break;
    checked = dedupeFacts([
      ...checked,
      ...(await checkSemantics(corpus.documents, additions, drop)),
    ]);
    const after = conceptCoverage(hints, checked);
    console.log(
      JSON.stringify({
        type: "ingest_stage",
        stage: "coverage_repair",
        round,
        facts: checked.length,
        coverage: after.percentage,
      }),
    );
    if (after.percentage <= coverage.percentage) break;
  }
  console.log(JSON.stringify({ type: "ingest_stage", stage: "semantic", facts: checked.length }));
  const normalised = dedupeFacts(await normaliseFacts(checked));
  console.log(
    JSON.stringify({
      type: "ingest_stage",
      stage: "normalised",
      facts: normalised.length,
      elapsedMs: Math.round(performance.now() - started),
    }),
  );
  const clustered = await clusterEntities(normalised);
  console.log(
    JSON.stringify({
      type: "ingest_stage",
      stage: "entities",
      entities: clustered.entities.length,
      elapsedMs: Math.round(performance.now() - started),
    }),
  );
  const translationResult = await translated;
  if (!translationResult.documents) throw translationResult.error;
  corpus.documents = translationResult.documents;
  const findingsUrl = new URL("../findings/index.ts", import.meta.url);
  if (!existsSync(findingsUrl))
    throw new Error(
      "Findings lane is not ready: findings/index.ts missing; corpus was not replaced",
    );
  const { computeFindings, storeFindings } = await import(findingsUrl.href);
  console.log(
    JSON.stringify({
      type: "ingest_stage",
      stage: "findings_start",
      llm: options.llmFindings,
      elapsedMs: Math.round(performance.now() - started),
    }),
  );
  const findings = await computeFindings(
    { documents: corpus.documents, facts: clustered.facts },
    { llm: options.llmFindings },
  );
  const db = getDb();
  await writeCorpus(db, corpus, clustered.entities, clustered.facts);
  if (options.embed) await embedCorpus(db, corpus);
  await storeFindings(db, corpus.patient.id, corpus.revisionId, findings);
  const coverage = printCoverage(hints, clustered.facts);
  const perKind: Record<string, number> = {};
  for (const fact of clustered.facts) perKind[fact.kind] = (perKind[fact.kind] ?? 0) + 1;
  const findingsByType: Record<string, number> = {};
  for (const finding of findings)
    findingsByType[finding.type] = (findingsByType[finding.type] ?? 0) + 1;
  const support = {
    supported: clustered.facts.filter((fact) => fact.support === "supported").length,
    partial: clustered.facts.filter((fact) => fact.support === "partial").length,
  };
  const summary = {
    support,
    type: "ingest_summary",
    documents: corpus.documents.length,
    segments: corpus.documents.reduce((count, cd) => count + cd.segments.length, 0),
    facts: clustered.facts.length,
    perKind,
    dropped,
    findingsByType,
    coverage: coverage.percentage,
    durationMs: Math.round(performance.now() - started),
  };
  console.log(JSON.stringify(summary));
  const warmUrl = new URL("../lens/warm.ts", import.meta.url);
  if (options.warm && existsSync(warmUrl)) {
    const module = await import(warmUrl.href);
    if (typeof module.warm === "function") await module.warm();
  }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ingest().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
