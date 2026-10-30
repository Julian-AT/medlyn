import type { CorpusDocument } from "../corpus.ts";
import { sha256 } from "../hash.ts";
import { normalise } from "../normalise.ts";
import { segment } from "../segment.ts";
import { titleEn } from "../titles.ts";
import { type Page, type PassageBox, validBox } from "./types.ts";

export type DocumentMetadata = {
  id: string;
  patientId: string;
  date: string;
  title: string;
  type?: string;
  department?: string;
};
export type ConvertedDocument = {
  document: CorpusDocument;
  passages: PassageBox[];
  pages: Page[];
};

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Offsets refer to normalised text; boxes use fractions of the rendered page dimensions. */
export function toDocument(pages: Page[], metadata: DocumentMetadata): ConvertedDocument {
  if (!pages.length) throw new Error("No PDF pages");
  if (!metadata.id || !metadata.patientId || !metadata.title) {
    throw new Error("Missing document metadata");
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(metadata.date) ||
    new Date(metadata.date).toISOString().slice(0, 10) !== metadata.date
  ) {
    throw new Error("Invalid document date");
  }
  const ordered = [...pages].sort((a, b) => a.page - b.page);
  if (ordered.some((page, index) => page.page !== index + 1)) {
    throw new Error("Non-contiguous PDF pages");
  }
  const passages: PassageBox[] = [];
  const lines: string[] = [];
  let offset = 0;
  for (const page of ordered) {
    if (page.source === "scan") throw new Error(`Page ${page.page} needs OCR`);
    for (const line of page.lines) {
      if (!line.text.trim()) continue;
      if (!validBox(line.bbox)) throw new Error(`Invalid box on page ${page.page}`);
      if (/[\r\n]/.test(line.text)) throw new Error("Page lines must not contain line breaks");
      if (lines.length) offset++;
      const start = offset;
      offset += line.text.length;
      lines.push(line.text);
      if (!line.words.length) {
        passages.push({ start, end: offset, page: page.page, bbox: line.bbox });
        continue;
      }
      let cursor = 0;
      for (const word of line.words) {
        const index = line.text.indexOf(word.text, cursor);
        if (index < 0 || !word.text || !validBox(word.bbox)) {
          throw new Error("Invalid embedded word box");
        }
        passages.push({
          start: start + index,
          end: start + index + word.text.length,
          page: page.page,
          bbox: word.bbox,
        });
        cursor = index + word.text.length;
      }
    }
  }
  const rawText = lines.map(escapeText).join("<BR>");
  const { text: normText, offsetMap } = normalise(rawText);
  if (!normText.trim()) throw new Error("PDF has no transcribed text");
  const revisionId = `rev-${sha256(JSON.stringify({ metadata, normText })).slice(0, 12)}`;
  const document: CorpusDocument = {
    doc: {
      id: metadata.id,
      patientId: metadata.patientId,
      revisionId,
      title: metadata.title,
      titleEn: titleEn(metadata.title, metadata.type ?? "PDF"),
      docType: metadata.type ?? "PDF",
      docDate: metadata.date,
      department: metadata.department ?? "",
    },
    rawText,
    normText,
    offsetMap,
    segments: segment(normText).map((entry) => ({
      ...entry,
      id: `${metadata.id}-s${entry.ordinal}`,
      documentId: metadata.id,
      textEn: null,
    })),
  };
  return { document, passages, pages: ordered };
}

/** A passage can span several physical lines and pages; return each intersecting box. */
export function passageBoxes(passages: PassageBox[], start: number, end: number): PassageBox[] {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) return [];
  return passages.filter((entry) => entry.start < end && entry.end > start);
}
