import { createReadStream } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { contentHash, factId } from "../../packages/engine/ingest/hash.ts";
import { locate } from "../../packages/engine/ingest/locate.ts";
import { normalise } from "../../packages/engine/ingest/normalise.ts";
import { segment } from "../../packages/engine/ingest/segment.ts";

const root = path.resolve(process.argv[2] ?? "ml/data/synth-v1");
const locateEvery = Number(process.argv[3] ?? 100);
if (!Number.isSafeInteger(locateEvery) || locateEvery < 1)
  throw new Error("Invalid locate interval");
const counts = { patients: 0, documents: 0, facts: 0, engineLocated: 0, failures: 0 };
const families = new Map();
const splits = { train: 0, val: 0, test: 0 };
let current = null;
let currentPath = null;
for await (const line of createInterface({
  input: createReadStream(path.join(root, "index.jsonl")),
  crlfDelay: Infinity,
})) {
  const entry = JSON.parse(line);
  const assigned = families.get(entry.family);
  if (assigned && assigned !== entry.split) throw new Error(`Family leakage: ${entry.family}`);
  families.set(entry.family, entry.split);
  splits[entry.split]++;
  if (currentPath === entry.shard) continue;
  if (current) current.close();
  currentPath = entry.shard;
  current = createInterface({
    input: createReadStream(path.join(root, currentPath)),
    crlfDelay: Infinity,
  });
  for await (const patientLine of current) {
    const record = JSON.parse(patientLine);
    const docs = new Map(
      record.documents.map((document) => {
        const text = normalise(document.text).text;
        return [document.metadata.id, { text, segments: segment(text) }];
      }),
    );
    const checkLocate = record.generation.index % locateEvery === 0;
    for (const fact of record.labels.facts) {
      const doc = docs.get(fact.documentId);
      const source = doc?.segments.find((s) => s.start <= fact.start && s.end >= fact.end);
      if (!source || doc.text.slice(fact.start, fact.end) !== fact.quote)
        throw new Error(
          `Invalid engine segment/span: ${fact.documentId}@${fact.start}–${fact.end}`,
        );
      if (fact.segmentId !== `${fact.documentId}-s${source.ordinal}`)
        throw new Error(`Segment identity mismatch: ${fact.id}`);
      if (checkLocate) {
        if (fact.contentHash !== contentHash(fact) || fact.id !== factId(fact.contentHash))
          throw new Error(`Content identity mismatch: ${fact.id}`);
        const located = locate(fact.quote, source, {
          labelEn: fact.labelEn,
          attrs: fact.attrs,
          eventDate: fact.eventDate,
          dueDate: fact.dueDate,
        });
        if (!located.ok || located.start !== fact.start || located.end !== fact.end)
          throw new Error(`Engine locate rejected ${fact.id}: ${JSON.stringify(located)}`);
        counts.engineLocated++;
      }
      counts.facts++;
    }
    counts.patients++;
    counts.documents += docs.size;
  }
  current = null;
}
console.log(JSON.stringify({ ...counts, splits, generationFamilies: families.size, locateEvery }));
