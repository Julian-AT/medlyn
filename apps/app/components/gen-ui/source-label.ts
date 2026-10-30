import type { Document } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";

type Source = { segmentId: string; documentId?: string; date?: string; label?: string };
type SourceDocument = Pick<Document, "id" | "titleEn" | "docDate">;

export function sourceLabel(source: Source, documents: Map<string, SourceDocument>) {
  const documentId = source.documentId ?? source.segmentId.replace(/-s\d+$/, "");
  const document = documents.get(documentId);
  const title = document?.titleEn.trim() || "Source";
  const date = document?.docDate ?? source.date;
  return { ...source, documentId, label: date ? `${title} · ${formatDate(date)}` : title };
}
