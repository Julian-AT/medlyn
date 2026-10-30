import type { DocumentView, PassageView } from "@medlyn/engine/contracts";
import path from "node:path";
import { getDocument, getPassage } from "@medlyn/engine/evidence/passage";
import { pathToFileURL } from "node:url";

const mockTerms: Record<string, RegExp> = {
  procedure: /quadranten|quadrant.*IORT/i,
  "allergy-contrast": /kontrastmittel|km-allergie/i,
  asa: /thrombo.*ass/i,
  ef: /EF.*60|60.*EF|auswurffraktion/i,
  "holter-af": /sinusrhythmus/i,
  "candesartan-2015": /blopress/i,
  "candesartan-2016": /blopress/i,
  metformin: /glucophage/i,
  pioglitazone: /actos/i,
  exenatide: /byetta/i,
  hba1c: /hba1c/i,
  "carotid-right": /rechts.*carotis/i,
  "carotid-left": /carotis.*links/i,
};

export async function corpusDocument(id: string): Promise<DocumentView | null> {
  if (!process.env.MEDLYN_DATA_PATH) throw new Error("MEDLYN_DATA_PATH is not configured");
  const root = process.env.MEDLYN_REPO_ROOT;
  if (!root) throw new Error("Repository root is not configured");
  const source = pathToFileURL(path.join(root, "packages/engine/ingest/corpus.ts")).href;
  const { loadCorpus } = (await import(/* webpackIgnore: true */ source)) as {
    loadCorpus: (dataPath: string) => {
      documents: { doc: DocumentView["document"]; segments: DocumentView["segments"] }[];
    };
  };
  const document = loadCorpus(path.resolve(root, process.env.MEDLYN_DATA_PATH)).documents.find(
    (item) => item.doc.id === id,
  );
  return document ? { document: document.doc, segments: document.segments } : null;
}

export async function readDocument(id: string): Promise<DocumentView | null> {
  if (process.env.MEDLYN_MOCK === "1") return corpusDocument(id);
  try {
    return await getDocument(id);
  } catch (error) {
    console.warn(
      "Document read unavailable",
      error instanceof Error ? error.message : "Unknown error",
    );
    return corpusDocument(id);
  }
}

export async function readPassage(id: string): Promise<PassageView | null> {
  const mock = /^seg-(\d+)-(.+)$/.exec(id);
  if (!mock) {
    if (process.env.MEDLYN_MOCK !== "1") return getPassage(id);
    const documentId = /^(.*)-s\d+$/.exec(id)?.[1];
    if (!documentId) return null;
    const document = await corpusDocument(documentId);
    if (!document) return null;
    const index = document.segments.findIndex((segment) => segment.id === id);
    if (index < 0) return null;
    return {
      document: document.document,
      segment: document.segments[index],
      before: document.segments.slice(Math.max(0, index - 2), index),
      after: document.segments.slice(index + 1, index + 3),
    };
  }
  const document = await readDocument(mock[1]);
  const term = mockTerms[mock[2]];
  if (!document || !term) return null;
  const index = document.segments.findIndex((segment) => term.test(segment.text));
  if (index < 0) return null;
  return {
    document: document.document,
    segment: document.segments[index],
    before: document.segments.slice(Math.max(0, index - 2), index),
    after: document.segments.slice(index + 1, index + 3),
  };
}
