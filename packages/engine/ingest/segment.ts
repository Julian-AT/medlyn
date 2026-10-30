import type { SegmentKind } from "../contracts.ts";
import { required } from "../required.ts";
export type RawSegment = {
  kind: SegmentKind;
  section: string | null;
  ordinal: number;
  start: number;
  end: number;
  text: string;
};
export const MEDICATION_SECTION = "Entlassungsmedikation";
const TABLE_END = /^Mit freundlichen Grüßen/;
const LIST_SECTIONS = new Set(["Diagnosen", "Allergien"]);
const HEADING = /^[^:]{2,100}:$/;
const INLINE_SECTIONS = [
  "Gesamtbeurteilung",
  "Weiteres Procedere",
  "Procedere",
  "Zusammenfassung",
  "Befundzusammenfassung",
  "Interpretation",
  "Anamnese",
  "Diagnose",
  "Therapie",
];
const BARE_HEADINGS = new Set([
  "Gesamtbeurteilung",
  "Befundzusammenfassung",
  "Zusammenfassung",
  "Laborbefund",
  "Diagnosen",
  "Allergien",
  "Anamnese",
  "Erhobene Befunde",
  "Labor",
  "Therapie und Verlauf",
  "Entlassungsmedikation",
  "Weiteres Procedere",
  "Verlauf",
  "Vitalparameter",
  "Befunde",
  "Mikroskopischer Befund",
  "Immunhistologisches Profil",
  "Diagnose",
]);
const ABBREVIATIONS = new Set([
  "st.p.",
  "z.n.",
  "vd.a.",
  "v.a.",
  "li.",
  "re.",
  "bds.",
  "pat.",
  "dr.",
  "prim.",
  "diab.",
  "mell.",
  "z.b.",
  "ca.",
  "bzw.",
  "fr.",
  "hr.",
  "nr.",
  "i.v.",
  "s.c.",
  "i.m.",
  "tabl.",
  "art.",
  "a.",
  "aa.",
  "v.",
  "li.,",
  "re.,",
  "geb.",
  "lt.",
  "evtl.",
  "inkl.",
  "max.",
  "min.",
  "o.",
  "u.",
  "vs.",
  "ggf.",
  "zn.",
  "st.",
  "dd.",
  "rez.",
  "wg.",
  "gem.",
  "ventr.",
  "sin.",
]);
function sentenceBounds(line: string): [number, number][] {
  const bounds: [number, number][] = [];
  let start = 0;
  for (const match of line.matchAll(/[.!?](?=\s+\S)/g)) {
    const end = match.index + 1;
    const token = required(line.slice(0, end).split(/\s+/).at(-1)).toLowerCase();
    if (ABBREVIATIONS.has(token) || /^\d+\.$/.test(token) || /^[a-zäöü]\.$/i.test(token)) continue;
    if (match[0] === "." && line[end] === ".") continue;
    bounds.push([start, end]);
    start = end;
  }
  bounds.push([start, line.length]);
  return bounds
    .map(([s, e]): [number, number] => {
      const lead = line.slice(s, e).length - line.slice(s, e).trimStart().length;
      return [s + lead, s + line.slice(s, e).trimEnd().length];
    })
    .filter(([s, e]) => e > s);
}
function inlineSection(text: string) {
  return INLINE_SECTIONS.find(
    (name) => text.startsWith(`${name}:`) && text.length > name.length + 1,
  );
}
/** Splits normalised text into headings, table rows, list items and sentences with document offsets. */
export function segment(text: string): RawSegment[] {
  const segments: RawSegment[] = [];
  let section: string | null = null;
  let offset = 0;
  const push = (kind: SegmentKind, start: number, end: number) =>
    segments.push({
      kind,
      section,
      ordinal: segments.length,
      start,
      end,
      text: text.slice(start, end),
    });
  let pending: {
    start: number;
    end: number;
  } | null = null;
  const flush = () => {
    if (!pending) return;
    const { start, end } = pending;
    for (const [s, e] of sentenceBounds(text.slice(start, end)))
      push("sentence", start + s, start + e);
    pending = null;
  };
  for (const line of text.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const start = lineStart + line.indexOf(trimmed);
    const end = start + trimmed.length;
    if (HEADING.test(trimmed) || BARE_HEADINGS.has(trimmed)) {
      flush();
      section = trimmed.replace(/:$/, "").trim();
      push("heading", start, end);
      continue;
    }
    if (section === MEDICATION_SECTION && TABLE_END.test(trimmed)) {
      flush();
      section = null;
    }
    if (section === MEDICATION_SECTION) {
      push("table_row", start, end);
      continue;
    }
    const inline = inlineSection(trimmed);
    if (inline) {
      flush();
      section = inline;
      push("heading", start, start + inline.length + 1);
      const content = start + inline.length + 1;
      const lead = text.slice(content, end).length - text.slice(content, end).trimStart().length;
      for (const [s, e] of sentenceBounds(text.slice(content + lead, end)))
        push("sentence", content + lead + s, content + lead + e);
      continue;
    }
    if (
      /^(?:Sehr geehrte|Wir berichten|Mit (?:freundlichen|kollegialen))/i.test(trimmed) &&
      section &&
      LIST_SECTIONS.has(section)
    ) {
      flush();
      section = null;
    }
    if (section && LIST_SECTIONS.has(section)) {
      push("list_item", start, end);
      continue;
    }
    const previous = pending ? text.slice(pending.start, pending.end) : "";
    const lastToken = previous.split(/\s+/).at(-1)?.toLowerCase() ?? "";
    const unfinished = previous && (!/[.!?;]$/.test(previous) || ABBREVIATIONS.has(lastToken));
    const continuation =
      !/^[^:]{1,90}:/.test(trimmed) &&
      !/^Mit (?:freundlichen|kollegialen) Grüßen/.test(previous) &&
      (/^[a-zäöü(]/.test(trimmed) ||
        /,$/.test(previous) ||
        ABBREVIATIONS.has(lastToken) ||
        /\b(?:von|vom|am|um|auf|mit|und|zu)\s*$/.test(previous));
    if (pending && unfinished && continuation) pending.end = end;
    else {
      flush();
      pending = { start, end };
    }
  }
  flush();
  return segments;
}
