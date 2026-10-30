import { createReadStream } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { normalise } from "@medlyn/engine/ingest/normalise";
import { repoRoot } from "../data.ts";
import type { SyntheticPatient } from "./types.ts";

export async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function isPatient(value: unknown): value is SyntheticPatient {
  const row = value as SyntheticPatient;
  return !!row?.patient?.id && Array.isArray(row.documents) && Array.isArray(row.labels?.facts);
}

export function validatePatient(row: SyntheticPatient): void {
  if (!row.patient.id.startsWith("synth-"))
    throw new Error("Only synthetic patient ids are allowed");
  const documents = new Map(
    row.documents.map((doc) => [String(doc.metadata.id), normalise(doc.text).text]),
  );
  if (documents.size !== row.documents.length)
    throw new Error(`${row.patient.id}: duplicate document id`);
  for (const fact of row.labels.facts) {
    const text = documents.get(fact.documentId);
    if (
      !fact.quote ||
      fact.start < 0 ||
      fact.end <= fact.start ||
      text?.slice(fact.start, fact.end) !== fact.quote
    ) {
      throw new Error(`${row.patient.id}: invalid label span ${fact.id}`);
    }
  }
  for (const item of [...row.labels.contradictions, ...row.labels.distractors]) {
    if (
      item.passages.length < 2 ||
      item.passages.some((p) => {
        const text = documents.get(p.documentId);
        return !text || p.start < 0 || p.end <= p.start || p.end > text.length;
      })
    )
      throw new Error(`${row.patient.id}: invalid finding spans ${item.id}`);
  }
}

async function dataFiles(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const files: string[] = [];
  for (const item of (await readdir(root, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const file = path.join(root, item.name);
    if (item.isDirectory()) files.push(...(await dataFiles(file)));
    else if (/\.(?:json|jsonl)$/.test(item.name) && !/^(?:manifest|index)\./.test(item.name))
      files.push(file);
  }
  return files;
}

export async function loadPatients(
  limit = 50,
  preferredIds: string[] = [],
): Promise<SyntheticPatient[]> {
  const roots = process.env.EVAL_SYNTH_DATA
    ? [path.resolve(repoRoot, process.env.EVAL_SYNTH_DATA)]
    : [path.join(repoRoot, "ml/data/sample"), path.join(repoRoot, "ml/data/synth-v1/shards")];
  const selected = new Map<string, SyntheticPatient>();
  const preferred = new Set(preferredIds);
  const consider = (value: unknown) => {
    for (const row of Array.isArray(value) ? value : [value]) {
      if (
        !isPatient(row) ||
        selected.has(row.patient.id) ||
        (selected.size >= limit && !preferred.has(row.patient.id))
      )
        continue;
      validatePatient(row);
      selected.set(row.patient.id, row);
    }
  };
  for (const root of roots) {
    for (const file of await dataFiles(root)) {
      if (file.endsWith(".jsonl")) {
        const input = createReadStream(file);
        const lines = createInterface({ input, crlfDelay: Infinity });
        try {
          for await (const line of lines) {
            if (line.trim()) consider(JSON.parse(line));
            if (selected.size >= limit && [...preferred].every((id) => selected.has(id))) break;
          }
        } finally {
          lines.close();
          input.destroy();
        }
      } else consider(JSON.parse(await readFile(file, "utf8")));
      if (selected.size >= limit && [...preferred].every((id) => selected.has(id))) break;
    }
    if (selected.size >= limit && [...preferred].every((id) => selected.has(id))) break;
  }
  return [...selected.values()]
    .sort(
      (a, b) =>
        Number(preferred.has(b.patient.id)) - Number(preferred.has(a.patient.id)) ||
        a.patient.id.localeCompare(b.patient.id),
    )
    .slice(0, limit);
}
