import { describe, expect, it } from "vitest";
import type { Segment } from "../contracts.ts";
import { checkedTokens, locate } from "../ingest/locate.ts";

function source(text: string): Segment {
  return { id: "synthetic-s0", documentId: "synthetic", kind: "sentence", section: null, start: 37, end: 37 + text.length, text, textEn: null };
}

describe("location layer", () => {
  it("returns document offsets and actual exact text", () => {
    const s = source("Messwert heute: 42 mm links.");
    expect(locate("42 mm links", s, { size: "42 mm", side: "left" })).toEqual({ ok: true, start: 53, end: 64, quote: "42 mm links", match: "exact" });
  });

  it("matches whitespace and case without changing original offsets", () => {
    const s = source("Befund: LINKS\n  42 mm, stabil.");
    const result = locate("links 42 MM", s, { value: "42mm", side: "li." });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.match).toBe("normalised");
      expect(result.quote).toBe("LINKS\n  42 mm");
      expect(s.text.slice(result.start - s.start, result.end - s.start)).toBe(result.quote);
    }
  });

  it("allows a small transcription error and returns the real passage", () => {
    const result = locate("Die linke Wade ist klinisch unaufällig.", source("Die linke Wade ist klinisch unauffällig."), { side: "left" });
    expect(result.ok && result.match).toBe("fuzzy");
    expect(result.ok && result.quote).toBe("Die linke Wade ist klinisch unauffällig.");
  });

  it("rejects fuzzy quotations below the threshold", () => {
    expect(locate("Eine völlig andere Aussage.", source("Die linke Wade ist unauffällig."), {}).ok).toBe(false);
  });

  it("rejects missing numbers, doses, fractions and sides", () => {
    const s = source("Lokal links 42 mm, Dosis 10 mg, 1/2 Tablette.");
    for (const fields of [{ value: 420 }, { value: "4 mm" }, { value: "100mg" }, { value: "1/4" }, { side: "right" }]) {
      expect(locate(s.text, s, fields).ok).toBe(false);
    }
  });

  it("checks even numbers changed by a fuzzy quote", () => {
    const s = source("Die gemessene Strecke beträgt heute 42 mm links.");
    expect(locate("Die gemessene Strecke beträgt heute 43 mm links.", s, { value: "43 mm" }).ok).toBe(false);
  });

  it.each(["2016-05-16", "16.05.2016", "16 May 2016", "16. Mai 2016"])("normalises date %s", (date) => {
    const s = source("Termin am 16.05.2016 vorgesehen.");
    expect(locate(s.text, s, { eventDate: date }).ok).toBe(true);
  });

  it("normalises German percentage suffixes, doses, sides and half symbols", () => {
    const s = source("Befund rechts: 60%ige Verengung, 100mg, ½ Tablette, bds. stabil.");
    expect(locate(s.text, s, { percent: "60%", dose: "100 mg", half: "1/2", side: ["re.", "bilateral"] }).ok).toBe(true);
  });

  it("normalises month precision without inventing a day", () => {
    for (const date of ["06/2015", "June 2015", "Juni 2015", "2015-06"]) {
      const s = source(`Kontrolle ${date} vorgesehen.`);
      expect(locate(s.text, s, { eventDate: "2015-06" }).ok).toBe(true);
      expect(locate(s.text, s, { eventDate: "2015-06-12" }).ok).toBe(false);
    }
    const s = source("Kontrolle am 12.06.2015 durchgeführt.");
    expect(locate(s.text, s, { eventDate: "2015-06" }).ok).toBe(true);
    expect(locate(s.text, s, { eventDate: "2015" }).ok).toBe(true);
  });

  it("recognises declined and undotted side abbreviations", () => {
    const s = source("An linkem Arm, li > re, beidseitigem Befund.");
    expect(locate(s.text, s, { sides: ["left", "right", "bilateral"] }).ok).toBe(true);
  });

  it("extracts nested checked tokens, including fractional schedules", () => {
    expect(checkedTokens({ attrs: { schedule: ["1", "0", "½", "0"], dose: "5 µg", side: "linken" }, date: "16 May 2016" })).toEqual(["1", "0", "1/2", "5mcg", "left", "2016-05-16"]);
  });

  it("rejects empty quotes and limits matches to the supplied segment", () => {
    expect(locate(" ", source(" " ), {}).ok).toBe(false);
    expect(locate("42", source("kein Messwert"), {}).ok).toBe(false);
  });
});
