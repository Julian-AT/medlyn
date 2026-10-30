import type { SegmentKind } from "../contracts.ts";

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
const HEADING = /^[^:\d]{2,44}:$/;
const INLINE_SECTIONS = [
  "Gesamtbeurteilung",
  "Weiteres Procedere",
  "Procedere",
  "Zusammenfassung",
  "Befundzusammenfassung",
  "Interpretation",
];

const ABBREVIATIONS = new Set(
  [
    "st.p.", "z.n.", "vd.a.", "v.a.", "li.", "re.", "bds.", "pat.", "dr.", "prim.", "diab.",
    "mell.", "z.b.", "ca.", "bzw.", "fr.", "hr.", "nr.", "i.v.", "s.c.", "i.m.", "tabl.", "art.",
    "a.", "aa.", "v.", "li.,", "re.,", "geb.", "lt.", "evtl.", "inkl.", "max.", "min.", "o.",
    "u.", "vs.", "ggf.", "zn.", "st.", "dd.", "rez.",
  ],
);

function sentenceBounds(line: string): [number, number][] {
  const bounds: [number, number][] = [];
  let start = 0;
  for (const match of line.matchAll(/[.!?](?=\s+[A-ZÄÖÜ0-9])/g)) {
    const end = match.index + 1;
    const token = line.slice(0, end).split(/\s+/).at(-1)!.toLowerCase();
    if (ABBREVIATIONS.has(token) || /^\d+\.$/.test(token) || /^[a-zäöü]\.$/i.test(token)) continue;
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
  return INLINE_SECTIONS.find((name) => text.startsWith(`${name}:`) && text.length > name.length + 1);
}

/** Splits normalised text into headings, table rows, list items and sentences with document offsets. */
export function segment(text: string): RawSegment[] {
  const segments: RawSegment[] = [];
  let section: string | null = null;
  let offset = 0;

  const push = (kind: SegmentKind, start: number, end: number) =>
    segments.push({ kind, section, ordinal: segments.length, start, end, text: text.slice(start, end) });

  for (const line of text.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const start = lineStart + line.indexOf(trimmed);
    const end = start + trimmed.length;

    if (HEADING.test(trimmed)) {
      section = trimmed.slice(0, -1).trim();
      push("heading", start, end);
      continue;
    }
    if (section === MEDICATION_SECTION && TABLE_END.test(trimmed)) section = null;
    if (section === MEDICATION_SECTION) {
      push("table_row", start, end);
      continue;
    }
    section = inlineSection(trimmed) ?? section;
    if (section && LIST_SECTIONS.has(section)) {
      push("list_item", start, end);
      continue;
    }
    for (const [s, e] of sentenceBounds(trimmed)) push("sentence", start + s, start + e);
  }
  return segments;
}
