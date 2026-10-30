import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Fact } from "../contracts.ts";
import { ingestStructured as structured } from "./extract.ts";
import type { CorpusDocument } from "./corpus.ts";
import { dedupeFacts, ExtractedFact, EXTRACTION_PROMPT, locatedFact, logDrop, mapBounded, type DropLog } from "./extract.ts";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export type ConceptHint = { source: string; documentId: string; name: string; text: string; value: string | null; unit: string | null; code: string | null };

export function dataDirectory(dataPath?: string): string {
  const configured = dataPath ?? process.env.MEDLYN_DATA_PATH;
  if (!configured) throw new Error("MEDLYN_DATA_PATH is not set");
  return path.resolve(REPO_ROOT, configured);
}

/** Read IBM's matched concepts as recall hints, never as evidence. */
export function loadConceptHints(dataPath?: string): ConceptHint[] {
  const hints: ConceptHint[] = [];
  for (const source of ["diagnoses", "procedures", "medication", "scores-all"]) {
    const data: unknown = JSON.parse(readFileSync(path.join(dataDirectory(dataPath), `${source}.json`), "utf8"));
    function visit(node: unknown, inherited: { name: string; unit: string | null; code: string | null }): void {
      if (Array.isArray(node)) { node.forEach((value) => visit(value, inherited)); return; }
      if (!node || typeof node !== "object") return;
      const row = node as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name : inherited.name;
      const unit = typeof row.unit === "string" ? row.unit : inherited.unit;
      const code = row.code && typeof row.code === "object" && "value" in row.code ? String(row.code.value) : inherited.code;
      if (Array.isArray(row.documentIds)) {
        for (const documentId of row.documentIds) {
          if (typeof documentId !== "string") continue;
          hints.push({ source, documentId, name, text: typeof row.text === "string" ? row.text : name, value: typeof row.value === "string" || typeof row.value === "number" ? String(row.value) : null, unit, code });
        }
      }
      for (const [key, value] of Object.entries(row)) {
        if (key === "values" || key === "scores") visit(value, { name, unit, code });
      }
    }
    visit(data, { name: "", unit: null, code: null });
  }
  return hints;
}

export async function recallFacts(documents: CorpusDocument[], existing: Fact[], hints: ConceptHint[], drop: DropLog = logDrop): Promise<Fact[]> {
  const additions = await mapBounded(documents, async (cd) => {
    const result = await structured("reasoning", "recall_facts", z.object({ facts: z.array(ExtractedFact) }), [
      { role: "system", content: `${EXTRACTION_PROMPT}\nThis is a recall pass. Extract facts missed or incompletely captured by existing facts. IBM hints may be wrong: verify every hint against the supplied segments. A source heading such as Holter or 24-hour BP supports a procedure fact. For scores extract separate atomic values with their concepts, not a generic numeric list. Existing medication table facts cover their rows. Return only new facts.` },
      { role: "user", content: JSON.stringify({ title: cd.doc.title, docDate: cd.doc.docDate, hints: hints.filter((h) => h.documentId === cd.doc.id), existing: existing.filter((f) => f.documentId === cd.doc.id).map(({ segmentId, kind, labelEn }) => ({ segmentId, kind, labelEn })), segments: cd.segments.filter((s) => s.kind !== "table_row").map(({ id, section, text }) => ({ id, section, text })) }) },
    ], { timeoutMs: 90_000 });
    return result.facts.map((f) => locatedFact(f, cd, drop, "recall")).filter((f): f is Fact => f !== null);
  });
  return dedupeFacts([...existing, ...additions.flat()]);
}
