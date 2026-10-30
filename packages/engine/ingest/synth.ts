import { createReadStream, existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { getDb } from "../db/client.ts";
import { computeFindings, storeFindings } from "../findings/index.ts";
import { loadCorpus } from "./corpus.ts";
import { clusterEntities } from "./entities.ts";
import { embedCorpus } from "./embed-step.ts";
import { dedupeFacts, extractFacts, VALIDATOR_VERSION, type DropLog } from "./extract.ts";
import { sha256 } from "./hash.ts";
import { parseMedicationTables } from "./medication.ts";
import { recallFacts } from "./recall.ts";
import { checkSemantics, normaliseFacts } from "./semantic.ts";
import { translateSegments } from "./translate.ts";
import { writeCorpus } from "./write.ts";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
type SyntheticPatient = {
  patient: { id: string; name: string; sex: string; dateOfBirth: string };
  documents: { metadata: { id: string; [key: string]: unknown }; text: string }[];
};

export function parseSynthArgs(args: string[]) {
  let patients = "100";
  let from = "ml/data/synth-v1";
  let noEmbed = false;
  let waitSeconds = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--no-embed") noEmbed = true;
    else if (["--patients", "--from", "--wait-seconds"].includes(arg)
      && args[i + 1] && !args[i + 1].startsWith("--")) {
      const value = args[++i];
      if (arg === "--patients") patients = value;
      if (arg === "--from") from = value;
      if (arg === "--wait-seconds") waitSeconds = Number(value);
    } else throw new Error(`Unknown or incomplete synth argument: ${arg}`);
  }
  if (/^\d+$/.test(patients)) {
    if (!Number.isSafeInteger(Number(patients)) || Number(patients) < 1) {
      throw new Error("Patient count must be positive");
    }
  } else if (patients.split(",").some((id) => !/^synth-[a-zA-Z0-9_-]+$/.test(id))) {
    throw new Error("Invalid synthetic patient ids");
  }
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0) throw new Error("Invalid wait seconds");
  return { patients, from: path.resolve(REPO_ROOT, from), noEmbed, waitSeconds };
}

export async function* readSyntheticPatients(root: string): AsyncGenerator<SyntheticPatient> {
  const shardRoot = existsSync(path.join(root, "shards")) ? path.join(root, "shards") : root;
  const files = (await readdir(shardRoot))
    .filter((file) => file.endsWith(".jsonl") && !file.startsWith(".") && file !== "index.jsonl")
    .sort();
  for (const file of files) {
    const stream = createReadStream(path.join(shardRoot, file));
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    try {
      for await (const line of lines) if (line.trim()) yield JSON.parse(line) as SyntheticPatient;
    } finally { lines.close(); stream.destroy(); }
  }
}

async function shardsReady(root: string) {
  const shardRoot = existsSync(path.join(root, "shards")) ? path.join(root, "shards") : root;
  if (!existsSync(shardRoot)) return false;
  return (await readdir(shardRoot)).some((file) =>
    file.endsWith(".jsonl") && !file.startsWith(".") && file !== "index.jsonl",
  );
}

/** Reuses normal extraction, location, semantic checking and storage; labels never enter ingestion. */
export async function ingestSyntheticPatient(input: SyntheticPatient, noEmbed = false) {
  const patientId = input.patient.id;
  if (!/^synth-[a-zA-Z0-9_-]+$/.test(patientId)) throw new Error("Expected a synthetic patient id");
  if (!input.documents.length) throw new Error("Synthetic patient has no documents");
  const root = await mkdtemp(path.join(tmpdir(), "medlyn-synth-"));
  try {
    await mkdir(path.join(root, "documents"));
    await writeFile(path.join(root, "patient.json"), JSON.stringify(input.patient));
    const documents = input.documents.map((document) => ({
      ...document,
      metadata: {
        ...document.metadata,
        id: document.metadata.id.startsWith(`${patientId}-`)
          ? document.metadata.id
          : `${patientId}-${document.metadata.id}`,
      },
    }));
    await writeFile(path.join(root, "documents.json"), JSON.stringify({
      documents: documents.map((doc) => doc.metadata),
    }));
    for (const document of documents) {
      if (!/^[a-zA-Z0-9_-]+$/.test(document.metadata.id)) throw new Error("Invalid synthetic document id");
      await writeFile(path.join(root, "documents", `${document.metadata.id}.json`), JSON.stringify(document));
    }
    const corpus = loadCorpus(root);
    corpus.patient.id = patientId;
    corpus.documentsHash = sha256(JSON.stringify([patientId, corpus.documentsHash]));
    corpus.revisionId = `rev-${corpus.documentsHash.slice(0, 12)}`;
    for (const document of corpus.documents) {
      document.doc.patientId = patientId;
      document.doc.revisionId = corpus.revisionId;
    }
    const drop: DropLog = (entry) => console.info("synth_ingest_drop", { patientId, ...entry });
    const translating = translateSegments(corpus.documents).then(
      (documents) => ({ documents, error: null }),
      (error: unknown) => ({ documents: null, error }),
    );
    const tables = corpus.documents.flatMap((document) => parseMedicationTables(document, VALIDATOR_VERSION));
    const extracted = await extractFacts(corpus.documents, drop);
    const recalled = await recallFacts(corpus.documents, [...tables, ...extracted], [], drop);
    const checked = await checkSemantics(corpus.documents, recalled, drop);
    const clustered = await clusterEntities(dedupeFacts(await normaliseFacts(checked)));
    const translation = await translating;
    if (!translation.documents) throw translation.error;
    corpus.documents = translation.documents;
    const findings = await computeFindings({ documents: corpus.documents, facts: clustered.facts });
    const db = getDb();
    await writeCorpus(db, corpus, clustered.entities, clustered.facts);
    await storeFindings(db, patientId, corpus.revisionId, findings);
    if (!noEmbed) await embedCorpus(db, corpus);
    return {
      patientId,
      revisionId: corpus.revisionId,
      documents: corpus.documents.length,
      facts: clustered.facts.length,
    };
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function runPatient(input: SyntheticPatient, noEmbed: boolean) {
  const root = await mkdtemp(path.join(tmpdir(), "medlyn-synth-job-"));
  const recordPath = path.join(root, "record.json");
  try {
    await writeFile(recordPath, JSON.stringify({
      patient: input.patient,
      documents: input.documents,
    }));
    const args = [
      "--experimental-strip-types", fileURLToPath(import.meta.url), "--patient-file", recordPath,
      ...(noEmbed ? ["--no-embed"] : []),
    ];
    // A failed patient must terminate its outstanding model calls before the next patient starts.
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) resolve();
        else reject(new Error(`Patient ingest exited with ${signal ?? code}`));
      });
    });
  } finally { await rm(root, { recursive: true, force: true }); }
}

export async function ingestSynthetic(args = process.argv.slice(2)) {
  process.env.MEDLYN_LLM_CONCURRENCY = "3";
  const opts = parseSynthArgs(args);
  const count = /^\d+$/.test(opts.patients) ? Number(opts.patients) : Infinity;
  const wanted = Number.isFinite(count) ? null : new Set(opts.patients.split(","));
  const start = Date.now();
  while (!await shardsReady(opts.from)) {
    if (Date.now() - start >= opts.waitSeconds * 1000) {
      throw new Error(`Synthetic shards are not ready at ${opts.from}`);
    }
    console.info("synth_waiting", { from: opts.from });
    await delay(5000);
  }
  const summary = { attempted: 0, ingested: 0, failed: 0 };
  for await (const patient of readSyntheticPatients(opts.from)) {
    if (wanted && !wanted.has(patient.patient.id)) continue;
    if (summary.attempted >= count) break;
    summary.attempted++;
    try {
      console.info("synth_ingest_start", { patientId: patient.patient.id });
      await runPatient(patient, opts.noEmbed);
      summary.ingested++;
      console.info("synth_ingest_done", { patientId: patient.patient.id });
    } catch (error) {
      summary.failed++;
      console.warn("synth_ingest_failed", {
        patientId: patient.patient.id,
        reason: error instanceof Error ? error.message : "Ingest failed",
      });
    }
    wanted?.delete(patient.patient.id);
    if (wanted && !wanted.size) break;
  }
  if (wanted?.size) console.warn("synth_patients_not_found", { ids: [...wanted] });
  if (!summary.attempted) throw new Error("No matching synthetic patients found");
  console.info("synth_ingest_summary", summary);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--patient-file" && process.argv[3]) {
    readFile(process.argv[3], "utf8")
      .then((text) => ingestSyntheticPatient(JSON.parse(text), process.argv.includes("--no-embed")))
      .then((result) => console.info("synth_patient_result", result))
      .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    ingestSynthetic().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
  }
}
