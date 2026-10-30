import { DocumentView, PassageView } from "@medlyn/engine/contracts";

export type SourceResources = { passage: PassageView; document: DocumentView };

export function parseSourceResource<K extends keyof SourceResources>(
  kind: K,
  id: string,
  body: unknown,
): SourceResources[K] {
  const data = kind === "passage" ? PassageView.parse(body) : DocumentView.parse(body);
  const actualId = "segment" in data ? data.segment.id : data.document.id;
  if (actualId !== id) throw new Error("Source identifier mismatch");
  const segments =
    "segment" in data ? [data.segment, ...data.before, ...data.after] : data.segments;
  if (segments.some((segment) => segment.documentId !== data.document.id))
    throw new Error("Source document mismatch");
  return data as SourceResources[K];
}
