import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Document, Patient, Segment } from "../contracts.ts";
import { PATIENT_ID } from "../store.ts";
import { sha256 } from "./hash.ts";
import { normalise } from "./normalise.ts";
import { segment } from "./segment.ts";
import { titleEn } from "./titles.ts";

export type CorpusDocument = {
  doc: Document;
  rawText: string;
  normText: string;
  offsetMap: number[];
  segments: (Segment & { ordinal: number })[];
};
export type Corpus = {
  patient: Patient;
  documents: CorpusDocument[];
  documentsHash: string;
  revisionId: string;
};

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
type Metadata = { id: string; title: string; type: string; date: string; department: string };

/** Loads the local challenge corpus without changing evidence or persisting anything. */
export function loadCorpus(dataPath?: string): Corpus {
  const configured = dataPath ?? process.env.MEDLYN_DATA_PATH;
  if (!configured) throw new Error("MEDLYN_DATA_PATH is not set");
  const root = path.resolve(REPO_ROOT, configured);
  const read = (name: string) => readFileSync(path.join(root, name), "utf8");
  const manifestText = read("documents.json");
  const patientText = read("patient.json");
  const manifest = JSON.parse(manifestText) as { documents: Metadata[] };
  const person = JSON.parse(patientText) as { name: string; sex: string; dateOfBirth: string };
  const files = readdirSync(path.join(root, "documents"))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const sources = files.map((file) => ({ file, json: read(`documents/${file}`) }));
  const documentsHash = sha256(JSON.stringify({ manifestText, patientText, sources }));
  const revisionId = `rev-${documentsHash.slice(0, 12)}`;
  const documents = sources.map(({ file, json }): CorpusDocument => {
    const id = file.slice(0, -5);
    const input = JSON.parse(json) as { metadata: Metadata; text: string };
    const meta = { ...manifest.documents.find((m) => m.id === id), ...input.metadata };
    if (typeof input.text !== "string" || !meta.title || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
      throw new Error(`Invalid document metadata/text: ${id}`);
    }
    const { text: normText, offsetMap } = normalise(input.text);
    return {
      doc: {
        id,
        patientId: PATIENT_ID,
        revisionId,
        title: meta.title,
        titleEn: titleEn(meta.title, meta.type),
        docType: meta.type,
        docDate: meta.date,
        department: meta.department,
      },
      rawText: input.text,
      normText,
      offsetMap,
      segments: segment(normText).map((s) => ({
        ...s,
        id: `${id}-s${s.ordinal}`,
        documentId: id,
        textEn: null,
      })),
    };
  });
  const [year, month, day] = person.dateOfBirth.split("-");
  const birthPattern = new RegExp(`\\bgeb\\.?\\s+(?:am\\s+)?${day}\\.${month}\\.${year}\\b`, "i");
  const birthSegment = documents.flatMap((d) => d.segments).find((s) => birthPattern.test(s.text));
  const birthDateQuote = birthSegment?.text.match(birthPattern)?.[0];
  if (!birthSegment || !birthDateQuote) throw new Error("Birth date has no located source passage");
  return {
    patient: {
      id: PATIENT_ID,
      displayName: person.name,
      sex: person.sex === "female" ? "F" : person.sex === "male" ? "M" : "X",
      birthDate: person.dateOfBirth,
      birthDateQuote,
      birthDateSegmentId: birthSegment.id,
    },
    documents,
    documentsHash,
    revisionId,
  };
}
