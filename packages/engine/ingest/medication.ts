import type { Fact, MedicationAttrs } from "../contracts.ts";
import { formatDate } from "../dates.ts";
import { brandToGeneric } from "./brands.ts";
import type { CorpusDocument } from "./corpus.ts";
import { contentHash, factId } from "./hash.ts";
import { locate } from "./locate.ts";
import { MEDICATION_SECTION } from "./segment.ts";

/** Parses discharge rows deterministically; unknown brands are left to the extraction lane. */
export function parseMedicationTables(cd: CorpusDocument, validatorVersion: string): Fact[] {
  const facts: Fact[] = [];
  for (const segment of cd.segments) {
    if (segment.kind !== "table_row" || segment.section !== MEDICATION_SECTION) continue;
    const mapped = brandToGeneric(segment.text);
    if (!mapped) continue;
    const row = segment.text;
    const strength = row.match(/\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|μg)\b/i);
    const route = row.match(/\b(?:oral|s\.c\.|i\.v\.|i\.m\.)(?=\s|$)/i);
    if (!route) continue;
    const rest = row.slice(route.index! + route[0].length).trim();
    const columns = rest.match(/^(\d+(?:[.,]\d+|\/\d+)?|½)\s+(\d+(?:[.,]\d+|\/\d+)?|½)\s+(\d+(?:[.,]\d+|\/\d+)?|½)\s+(\d+(?:[.,]\d+|\/\d+)?|½)(?:\s+(.+))?$/);
    const weekly = rest.match(/^(?:ST\s+)?(1x\/Woche\s+1\s+Tabl\.)$/i);
    if (!columns && !weekly) continue;
    const schedule: MedicationAttrs["schedule"] = columns ? [columns[1], columns[2], columns[3], columns[4]] : null;
    const extraDose = row.slice(0, route.index).match(/\b\d+[.,]\d+\s*$/)?.[0].trim() ?? null;
    const attrs: MedicationAttrs = {
      ...mapped, strength: strength ? `${strength[1]} ${strength[2]}` : null,
      route: route[0], schedule, scheduleText: weekly?.[1] ?? extraDose,
      unit: columns?.[5]?.trim() ?? (weekly ? (/^ST\s/.test(rest) ? "ST" : "Tabl.") : null),
      listLabel: `Discharge medication, ${formatDate(cd.doc.docDate)}`,
    };
    const located = locate(row, segment, { strength: attrs.strength, schedule, scheduleText: attrs.scheduleText });
    if (!located.ok) {
      console.warn(`Dropped medication ${segment.id}: ${located.reason}`);
      continue;
    }
    const base = {
      segmentId: segment.id, kind: "medication" as const,
      labelEn: `${mapped.generic} (${mapped.brand})${attrs.strength ? ` ${attrs.strength}` : ""}`,
      attrs, assertion: "present" as const, temporalStatus: "ongoing" as const, eventDate: cd.doc.docDate,
      quote: located.quote, start: located.start, end: located.end,
    };
    const hash = contentHash(base);
    facts.push({ ...base, attrs: { ...attrs }, id: factId(hash), contentHash: hash, documentId: cd.doc.id, datePrecision: "day", dueDate: null, docDate: cd.doc.docDate, entityId: null, locationOk: true, support: "supported", negationFlag: false, validatorVersion });
  }
  return facts;
}
