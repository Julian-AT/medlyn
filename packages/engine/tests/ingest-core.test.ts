import { describe, expect, it } from "vitest";
import { brandToGeneric } from "../ingest/brands.ts";
import { contentHash, factId, sha256 } from "../ingest/hash.ts";
import { normalise } from "../ingest/normalise.ts";
import { segment } from "../ingest/segment.ts";
import { titleEn } from "../ingest/titles.ts";

describe("normalisation", () => {
  it("decodes breaks and entities with raw offset round trips", () => {
    const raw = "Vor<BR>Äpfel &gt; Birnen &amp; &#176; &uuml; &#x1F33B; danach";
    const { text, offsetMap } = normalise(raw);
    expect(text).toBe("Vor\nÄpfel > Birnen & ° ü 🌻 danach");
    expect(offsetMap).toHaveLength(text.length + 1);
    expect(offsetMap.at(-1)).toBe(raw.length);
    expect(offsetMap.every((offset, i) => i === 0 || offset >= offsetMap[i - 1])).toBe(true);
    for (const term of ["Vor", "Äpfel", "Birnen", "danach"]) {
      const start = text.indexOf(term);
      expect(raw.slice(offsetMap[start], offsetMap[start + term.length])).toBe(term);
    }
    const start = text.indexOf("°");
    expect(raw.slice(offsetMap[start], offsetMap[start + 1])).toBe("&#176;");
  });

  it("keeps unknown and invalid entities literal", () => {
    const raw = "&unknown; &#0; &#x110000; &#xD800;";
    expect(normalise(raw)).toEqual({
      text: raw,
      offsetMap: Array.from({ length: raw.length + 1 }, (_, i) => i),
    });
    expect(normalise("x<br/>y<br />z").text).toBe("x\ny\nz");
  });
});

describe("segmentation", () => {
  it("does not split abbreviations, decimals or day/month dates", () => {
    const text =
      "St.p. Operation bei Dr. Beispiel, Z.n. Kontrolle li. Arm am 03. April, 36.6°C. Danach stabil.";
    const parts = segment(text);
    expect(parts.map((s) => s.text)).toEqual([
      text.slice(0, text.indexOf(" Danach")),
      "Danach stabil.",
    ]);
    for (const part of parts) expect(text.slice(part.start, part.end)).toBe(part.text);
  });

  it("recognises standalone and inline section headings without swallowing measurements", () => {
    const text =
      "Zusammenfassung:\nGröße: 170 cm\nRR bei Aufnahme:\n123/78 mmHg\nGesamtbeurteilung\nKein Husten.\nProcedere: Kontrolle morgen.";
    const parts = segment(text);
    expect(parts.filter((s) => s.kind === "heading").map((s) => s.section)).toEqual([
      "Zusammenfassung",
      "RR bei Aufnahme",
      "Gesamtbeurteilung",
      "Procedere",
    ]);
    expect(parts.find((s) => s.text === "Größe: 170 cm")?.kind).toBe("sentence");
    expect(parts.at(-1)?.text).toBe("Kontrolle morgen.");
    for (const part of parts) expect(text.slice(part.start, part.end)).toBe(part.text);
  });

  it("joins wrapped sentences while preserving newlines and stops at sections", () => {
    const text =
      "Anamnese:\nDie Person hat seit gestern einen\nleichten Husten. Danach beschwerdefrei.\nBefunde:\nPuls: 72/min";
    const parts = segment(text);
    expect(parts.filter((s) => s.kind === "sentence").map((s) => s.text)).toEqual([
      "Die Person hat seit gestern einen\nleichten Husten.",
      "Danach beschwerdefrei.",
      "Puls: 72/min",
    ]);
    expect(parts.every((s, i) => s.ordinal === i && text.slice(s.start, s.end) === s.text)).toBe(
      true,
    );
  });

  it("keeps medication table rows intact and stops at the closing", () => {
    const parts = segment(
      "Entlassungsmedikation:\nBeispielpräparat oral 2 0 0 0\nMit freundlichen Grüßen\nSignatur",
    );
    expect(parts.map((s) => s.kind)).toEqual(["heading", "table_row", "sentence", "sentence"]);
    expect(parts.at(-1)?.section).toBe(null);
  });
});

describe("curated names and hashes", () => {
  it.each([
    ["Thrombo ASS", "B01AC06"],
    ["Glucophage", "A10BA02"],
    ["Zocor", "C10AA01"],
    ["Blopress", "C09CA06"],
    ["Oleovit D3", "A11CC05"],
    ["Alendronat", "M05BA04"],
    ["Actos", "A10BG03"],
    ["Byetta", "A10BJ01"],
    ["Nitro-Spray", "C01DA02"],
  ])("maps %s with its ATC code", (brand, atc) => {
    expect(brandToGeneric(`${brand.toUpperCase()} 7mg oral`)?.atc).toBe(atc);
  });

  it("rejects unknown brands and substring matches", () => {
    expect(brandToGeneric("Unbekannt 7mg")).toBe(null);
    expect(brandToGeneric("ActosPlus")).toBe(null);
  });

  it("translates titles with an English fallback", () => {
    expect(titleEn("Stat. Patientenbrief (Interne)")).toBe(
      "Inpatient discharge letter (internal medicine)",
    );
    expect(titleEn("Unbekannt")).toBe("Clinical report");
  });

  it("hashes nested attributes independently of key order and changes on evidence edits", () => {
    const base = {
      segmentId: "synthetic-s2",
      kind: "measurement" as const,
      labelEn: "Pulse 72/min",
      attrs: { value: 72, context: { unit: "bpm", method: "manual" } },
      assertion: "present" as const,
      temporalStatus: "stated" as const,
      eventDate: null,
      quote: "Puls 72/min",
      start: 12,
      end: 23,
    };
    const hash = contentHash(base);
    expect(hash).toHaveLength(64);
    expect(
      contentHash({ ...base, attrs: { context: { method: "manual", unit: "bpm" }, value: 72 } }),
    ).toBe(hash);
    expect(contentHash({ ...base, start: 13 })).not.toBe(hash);
    expect(factId(hash)).toBe(`f-${hash.slice(0, 16)}`);
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
