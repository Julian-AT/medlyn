import { describe, expect, it } from "vitest";
import { locate } from "../ingest/locate.ts";
import { makeCorpus } from "../ingest/multimodal/pipeline.ts";
import { passageBoxes, toDocument } from "../ingest/multimodal/to-document.ts";
import { type Page, validBox } from "../ingest/multimodal/types.ts";

const metadata = { id: "pdf-example", patientId: "pdf-test", date: "2026-10-30", title: "Test" };
function page(lines: string[], ordinal = 1): Page {
  return {
    page: ordinal,
    imagePath: "/private/tmp/example.png",
    width: 1000,
    height: 1400,
    dpi: 200,
    source: "embedded",
    lines: lines.map((text, index) => ({
      text,
      bbox: { x0: 0.1, y0: 0.1 + index * 0.05, x1: 0.9, y1: 0.14 + index * 0.05 },
      words: [],
    })),
  };
}

describe("PDF text provenance", () => {
  it("uses normalised UTF-16 offsets and preserves literal entities and tags", () => {
    const text = ["Befund:", "Ödem links: 7 mm & <BR> 😀", "Kontrolle empfohlen."];
    const converted = toDocument([page(text)], metadata);
    expect(converted.document.normText).toBe(text.join("\n"));
    expect(converted.document.rawText).toContain("&amp; &lt;BR&gt;");
    for (const [index, passage] of converted.passages.entries()) {
      expect(converted.document.normText.slice(passage.start, passage.end)).toBe(text[index]);
    }
    expect(converted.document.offsetMap).toHaveLength(converted.document.normText.length + 1);
  });

  it("maps a quote spanning a page break to each intersecting page", () => {
    const converted = toDocument([page(["alpha"]), page(["beta"], 2)], metadata);
    expect(converted.document.normText).toBe("alpha\nbeta");
    expect(passageBoxes(converted.passages, 3, 8).map((entry) => entry.page)).toEqual([1, 2]);
    expect(passageBoxes(converted.passages, 5, 6)).toEqual([]);
    expect(passageBoxes(converted.passages, 6, 10).map((entry) => entry.page)).toEqual([2]);
    expect(passageBoxes(converted.passages, -1, 5)).toEqual([]);
  });

  it("uses embedded word boxes for precise passage highlighting", () => {
    const source = page(["Test 7301"]);
    source.lines[0].words = [
      { text: "Test", bbox: { x0: 0.1, y0: 0.1, x1: 0.3, y1: 0.14 } },
      { text: "7301", bbox: { x0: 0.4, y0: 0.1, x1: 0.6, y1: 0.14 } },
    ];
    const converted = toDocument([source], metadata);
    expect(passageBoxes(converted.passages, 5, 9)).toEqual([
      { start: 5, end: 9, page: 1, bbox: source.lines[0].words[1].bbox },
    ]);
  });

  it("locates numeric and sided claims against text rather than the page image", () => {
    const converted = toDocument([page(["Messwert links 7 mm."])], metadata);
    const source = converted.document.segments[0];
    const found = locate("Messwert links 7 mm.", source, { value: "7 mm", side: "left" });
    expect(found.ok).toBe(true);
    expect(locate("Messwert links 7 mm.", source, { value: "9 mm", side: "right" }).ok).toBe(false);
    if (found.ok) {
      expect(passageBoxes(converted.passages, found.start, found.end)).toHaveLength(1);
    }
  });

  it("rejects unavailable OCR, empty text, non-contiguous pages and malformed boxes", () => {
    expect(() => toDocument([{ ...page([]), source: "scan" }], metadata)).toThrow("needs OCR");
    expect(() => toDocument([page([])], metadata)).toThrow("no transcribed text");
    expect(() => toDocument([page(["Text"], 2)], metadata)).toThrow("Non-contiguous");
    const invalid = page(["Text"]);
    invalid.lines[0].bbox.x1 = 0;
    expect(() => toDocument([invalid], metadata)).toThrow("Invalid box");
    expect(validBox({ x0: 0, y0: 0, x1: Number.NaN, y1: 1 })).toBe(false);
    expect(() => toDocument([page(["a\nb"])], metadata)).toThrow("line breaks");
    expect(() => toDocument([page(["Text"])], { ...metadata, date: "2026-02-31" })).toThrow();
  });

  it("requires a located birth date and isolates corpus revisions by patient", () => {
    const converted = toDocument([page(["Beispiel, geb. 02.03.1980."])], metadata);
    const corpus = makeCorpus([converted.document], metadata.patientId);
    expect(corpus.patient.birthDate).toBe("1980-03-02");
    expect(corpus.patient.birthDateQuote).toBe("geb. 02.03.1980");
    expect(corpus.documents[0].doc.revisionId).toBe(corpus.revisionId);
    expect(makeCorpus([converted.document], metadata.patientId).revisionId).toBe(corpus.revisionId);
    const other = toDocument([page(["Beispiel, geb. 02.03.1980."])], {
      ...metadata,
      patientId: "other",
    });
    expect(makeCorpus([other.document], "other").revisionId).not.toBe(corpus.revisionId);
    expect(() => makeCorpus([converted.document], "wrong-patient")).toThrow("one patient's");
    expect(() =>
      makeCorpus([toDocument([page(["Text."])], metadata).document], metadata.patientId),
    ).toThrow("Birth date has no located");
  });
});
