import "server-only";
import type { DocumentView, PassageView } from "@medlyn/engine/contracts";
import { getDocument, getPassage } from "@medlyn/engine/evidence/passage";

export async function readDocument(id: string): Promise<DocumentView | null> {
  return getDocument(id);
}

// The labelled demo stream also resolves its source links from the database.
export const corpusDocument = readDocument;

export async function readPassage(id: string): Promise<PassageView | null> {
  return getPassage(id);
}
