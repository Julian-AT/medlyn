import { describe, expect, it } from "vitest";
import type { CorpusDocument } from "../ingest/corpus.ts";
import { parseMedicationTables } from "../ingest/medication.ts";
import { segment } from "../ingest/segment.ts";

function document(lines: string[], section = "Entlassungsmedikation"): CorpusDocument {
  const text = `${section}:\n${lines.join("\n")}\nMit freundlichen Grüßen`;
  return {
    doc: {
      id: "synthetic",
      patientId: "synthetic-person",
      revisionId: "rev-test",
      title: "synthetic",
      titleEn: "Synthetic report",
      docType: "test",
      docDate: "2020-07-02",
      department: "test",
    },
    rawText: text,
    normText: text,
    offsetMap: Array.from({ length: text.length + 1 }, (_, i) => i),
    segments: segment(text).map((s) => ({
      ...s,
      id: `synthetic-s${s.ordinal}`,
      documentId: "synthetic",
      textEn: null,
    })),
  };
}

describe("deterministic medication parser", () => {
  it("keeps all four schedule columns and the written dose unit", () => {
    const cd = document(["Blopress 8mg oral 0 1/2 0 1 ST"]);
    const facts = parseMedicationTables(cd, "test-validator");
    expect(facts).toHaveLength(1);
    const f = facts[0];
    expect(f.attrs).toEqual({
      generic: "Candesartan",
      brand: "Blopress",
      atc: "C09CA06",
      strength: "8 mg",
      route: "oral",
      schedule: ["0", "1/2", "0", "1"],
      scheduleText: null,
      unit: "ST",
      listLabel: "Discharge medication, 2 Jul 2020",
    });
    expect(cd.normText.slice(f.start, f.end)).toBe(f.quote);
    expect(f.labelEn).toBe("Candesartan (Blopress) 8 mg");
  });

  it("handles weekly schedules with and without a preceding unit", () => {
    for (const unit of ["ST ", ""]) {
      const [fact] = parseMedicationTables(
        document([`Alendronat 35mg oral ${unit}1x/Woche 1 Tabl.`]),
        "test",
      );
      expect(fact.attrs.schedule).toBe(null);
      expect(fact.attrs.scheduleText).toBe("1x/Woche 1 Tabl.");
      expect(fact.attrs.unit).toBe(unit ? "ST" : "Tabl.");
    }
  });

  it("keeps the separately written injection amount and optional dosing unit", () => {
    const [fact] = parseMedicationTables(
      document(["Byetta 10mcg 0,25 s.c. 0 1 0 1 Dosen"]),
      "test",
    );
    expect(fact.attrs.strength).toBe("10 mcg");
    expect(fact.attrs.scheduleText).toBe("0,25");
    expect(fact.attrs.route).toBe("s.c.");
    expect(fact.attrs.unit).toBe("Dosen");
  });

  it("skips headers, unknown brands, incomplete rows and other sections", () => {
    const cd = document([
      "Applikation mo mi ab na Einheit Info",
      "Fantasietablette 7mg oral 0 1 0 0 ST",
      "Zocor 5mg oral 1 0",
      "Actos 15mg ohne Applikation",
    ]);
    expect(parseMedicationTables(cd, "test")).toEqual([]);
    expect(
      parseMedicationTables(document(["Actos 15mg oral 1 0 0 0 ST"], "Anamnese"), "test"),
    ).toEqual([]);
  });
});
