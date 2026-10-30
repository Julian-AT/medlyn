import type { Fact, Patient } from "../../contracts.ts";
import type { Corpus, CorpusDocument } from "../corpus.ts";
import { clusterEntities } from "../entities.ts";
import { type DropLog, dedupeFacts, extractFacts, VALIDATOR_VERSION } from "../extract.ts";
import { sha256 } from "../hash.ts";
import { parseMedicationTables } from "../medication.ts";
import { type ConceptHint, recallFacts } from "../recall.ts";
import { checkSemantics, normaliseFacts } from "../semantic.ts";
import { translateSegments } from "../translate.ts";
import { retryStage, stageFacts } from "./stages.ts";

/** Reuses JSON ingestion, including locatedFact inside extraction and semantic repair. */
export async function extractDocumentFacts(
  documents: CorpusDocument[],
  drop?: DropLog,
  hints: ConceptHint[] = [],
): Promise<Fact[]> {
  const tables = documents.flatMap((doc) => parseMedicationTables(doc, VALIDATOR_VERSION));
  const extracted = await stageFacts("extract", documents, [], () => extractFacts(documents, drop));
  const all = [...tables, ...extracted];
  const recalled = await stageFacts(
    "recall",
    documents,
    all,
    () => recallFacts(documents, all, hints, drop),
    hints,
  );
  const checked = await stageFacts("semantic", documents, recalled, () =>
    checkSemantics(documents, recalled, drop),
  );
  const normalised = await stageFacts("normalise", documents, checked, () =>
    normaliseFacts(checked),
  );
  return dedupeFacts(normalised);
}

export function makeCorpus(documents: CorpusDocument[], patientId: string): Corpus {
  if (!patientId || !documents.length || documents.some((doc) => doc.doc.patientId !== patientId)) {
    throw new Error("A PDF corpus must contain one patient's documents");
  }
  if (new Set(documents.map((document) => document.doc.id)).size !== documents.length) {
    throw new Error("Duplicate PDF document ids");
  }
  const birth = documents
    .flatMap((doc) => doc.segments)
    .flatMap((source) => {
      const match = source.text.match(/\bgeb\.?\s+(?:am\s+)?(\d{2})\.(\d{2})\.(\d{4})\b/i);
      return match ? [{ source, match }] : [];
    })[0];
  if (!birth) throw new Error("Birth date has no located source passage");
  const birthDate = `${birth.match[3]}-${birth.match[2]}-${birth.match[1]}`;
  if (new Date(birthDate).toISOString().slice(0, 10) !== birthDate) {
    throw new Error("Invalid source birth date");
  }
  const patient: Patient = {
    id: patientId,
    displayName: patientId,
    sex: "X",
    birthDate,
    birthDateQuote: birth.match[0],
    birthDateSegmentId: birth.source.id,
  };
  const documentsHash = sha256(
    JSON.stringify({
      patientId,
      documents: [...documents]
        .sort((a, b) => a.doc.id.localeCompare(b.doc.id))
        .map(({ doc, rawText }) => ({ ...doc, revisionId: undefined, rawText })),
    }),
  );
  const revisionId = `rev-${documentsHash.slice(0, 12)}`;
  return {
    patient,
    documentsHash,
    revisionId,
    documents: documents.map((document) => ({
      ...document,
      doc: { ...document.doc, revisionId },
    })),
  };
}

export async function prepareCorpus(corpus: Corpus, drop?: DropLog, hints: ConceptHint[] = []) {
  const [clustered, documents] = await Promise.all([
    extractDocumentFacts(corpus.documents, drop, hints).then((facts) =>
      retryStage("entities", () => clusterEntities(facts)),
    ),
    retryStage("translation", () => translateSegments(corpus.documents)),
  ]);
  return { corpus: { ...corpus, documents }, ...clustered };
}
