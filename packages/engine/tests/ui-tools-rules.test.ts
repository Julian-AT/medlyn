import { describe, expect, it } from "vitest";
import {
  labUiPoints,
  locatedUiFacts,
  medicationUiLists,
  UiToolSchemas,
  uiTools,
} from "../agent/ui-tools.ts";
import type { Fact, Segment } from "../contracts.ts";
import { renderLine } from "../lens/templates.ts";

const window = {
  asOf: "2026-01-02",
  corpusRevision: "synthetic-revision",
  eligibleDocumentIds: ["synthetic-d1", "synthetic-d2"],
};
const ctx = { patientId: "synthetic-patient", sessionId: "synthetic-session", window };
const fact = (patch: Partial<Fact> = {}): Fact => ({
  id: "synthetic-f1",
  segmentId: "synthetic-d1-s0",
  documentId: "synthetic-d1",
  kind: "measurement",
  labelEn: "Weight",
  attrs: { value: "84", unit: "kg" },
  assertion: "present",
  temporalStatus: "stated",
  eventDate: null,
  datePrecision: null,
  dueDate: null,
  docDate: "2026-01-01",
  quote: "Synthetic weight 84 kg.",
  start: 5,
  end: 28,
  entityId: null,
  locationOk: true,
  support: "supported",
  negationFlag: false,
  contentHash: "synthetic-hash",
  validatorVersion: "synthetic-validator",
  ...patch,
});
const line = (source: Fact) => ({
  factId: source.id,
  segmentId: source.segmentId,
  documentId: source.documentId,
  quote: source.quote,
  line: renderLine(source, ctx),
});
const medication = (patch: Partial<Fact> = {}) =>
  fact({
    kind: "medication",
    labelEn: "Synthetic medicine",
    attrs: {
      generic: "Synthetic medicine",
      brand: null,
      strength: "20 mg",
      unit: null,
      route: null,
      schedule: ["1", "0", "1/2", "0"],
      scheduleText: null,
      listLabel: "Discharge medication",
      atc: null,
    },
    ...patch,
  });

describe("generative UI evidence rules", () => {
  it("exposes exactly the nine named UI tools with schemas and executable handlers", () => {
    const tools = uiTools(ctx);
    expect(Object.keys(tools).sort()).toEqual(Object.keys(UiToolSchemas).sort());
    for (const definition of Object.values(tools)) {
      expect(definition.inputSchema).toBeDefined();
      expect(definition.outputSchema).toBeDefined();
      expect(definition.execute).toBeTypeOf("function");
    }
  });

  it("keeps only supported quotes at their exact offsets in the source segment", () => {
    const source = fact({ end: 5 + "Synthetic weight 84 kg.".length });
    const segment: Segment = {
      id: source.segmentId,
      documentId: source.documentId,
      kind: "sentence",
      section: null,
      start: 5,
      end: source.end,
      text: source.quote,
      textEn: null,
    };
    expect(locatedUiFacts([source], [segment])).toEqual([source]);
    for (const invalid of [
      fact({ quote: "Made up" }),
      fact({ start: 6 }),
      fact({ end: 100 }),
      fact({ support: "unsupported" }),
      fact({ documentId: "other-patient-doc" }),
    ])
      expect(locatedUiFacts([invalid], [segment])).toEqual([]);
    expect(locatedUiFacts([source], [])).toEqual([]);
  });

  it("preserves list sources, fractional schedules and changes without inventing conflicts", () => {
    const before = medication();
    const after = medication({
      id: "synthetic-f2",
      documentId: "synthetic-d2",
      segmentId: "synthetic-d2-s0",
      docDate: "2026-01-02",
      attrs: { ...before.attrs, schedule: ["1", "0", "1", "0"] },
    });
    const result = medicationUiLists(
      [after, before],
      [line(after), line(before)],
      window.asOf,
      "all",
    );
    expect(UiToolSchemas.show_medications.safeParse(result).success).toBe(true);
    expect(result.lists.map((list) => list.listLabel)).toEqual([
      "Discharge medication, 2 Jan 2026",
      "Discharge medication, 1 Jan 2026",
    ]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].from.schedule).toBe("1-0-½");
    expect(result.changes[0].to.schedule).toBe("1-0-1");
    expect(result.changes[0].from.line.text).toBe(renderLine(before, ctx).text);
    expect(JSON.stringify(result)).not.toContain('"conflict"');
    expect(
      medicationUiLists([after, before], [line(after), line(before)], window.asOf).lists,
    ).toHaveLength(1);
  });

  it("does not duplicate a list date or label a list current", () => {
    const source = medication();
    const dated = medication({
      attrs: { ...source.attrs, listLabel: "Discharge medication, 1 Jan 2026" },
    });
    expect(medicationUiLists([dated], [line(dated)], window.asOf).lists[0].listLabel).toBe(
      "Discharge medication, 1 Jan 2026",
    );
    const current = medication({ attrs: { ...source.attrs, listLabel: "Current medication" } });
    expect(medicationUiLists([current], [line(current)], window.asOf).lists[0].listLabel).toBe(
      "Medication list, 1 Jan 2026",
    );
  });

  it("keeps different documents on the latest date and excludes invalid medication attrs", () => {
    const a = medication();
    const b = medication({ id: "synthetic-f2", documentId: "synthetic-d2" });
    const invalid = medication({ id: "synthetic-f3", attrs: {} });
    expect(
      medicationUiLists([a, b, invalid], [line(a), line(b), line(invalid)], window.asOf).lists,
    ).toHaveLength(2);
  });

  it("does not call one-off or negated medication changes a list trend", () => {
    const before = medication();
    for (const patch of [{ temporalStatus: "given_once" }, { assertion: "negated" }] as const) {
      const after = medication({
        id: "synthetic-f2",
        docDate: "2026-01-02",
        ...patch,
        attrs: { ...before.attrs, schedule: ["0", "0", "1", "0"] },
      });
      expect(
        medicationUiLists([before, after], [line(before), line(after)], window.asOf).changes,
      ).toEqual([]);
    }
  });

  it("uses checked numeric values, decimal commas, dates and explicit units", () => {
    const source = fact({ attrs: { value: "84,5", unit: "kg" }, eventDate: "2025-12-31" });
    const points = labUiPoints([source], [line(source)], "weight");
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      value: 84.5,
      unit: "kg",
      date: "2025-12-31",
      factId: source.id,
      segmentId: source.segmentId,
      quote: source.quote,
    });
    expect(
      UiToolSchemas.show_lab_trend.safeParse({
        measure: "weight",
        asOf: window.asOf,
        points,
        deltaLine: null,
      }).success,
    ).toBe(true);
  });

  it("keeps blood pressure components separate", () => {
    const bp = fact({ labelEn: "Blood pressure", attrs: { value: "128/76", unit: "mmHg" } });
    expect(
      labUiPoints([bp], [line(bp)], "blood_pressure").map(({ series, value }) => ({
        series,
        value,
      })),
    ).toEqual([
      { series: "systolic", value: 128 },
      { series: "diastolic", value: 76 },
    ]);
  });

  it("rejects inequalities, missing values, absent evidence and non-observed measurements", () => {
    for (const patch of [
      { attrs: { value: "<84", unit: "kg" } },
      { attrs: {} },
      { assertion: "negated" },
      { temporalStatus: "recommended" },
      { temporalStatus: "planned" },
    ] as Partial<Fact>[]) {
      const source = fact(patch);
      expect(labUiPoints([source], [line(source)], "weight")).toEqual([]);
    }
    expect(labUiPoints([fact()], [], "weight")).toEqual([]);
  });
});
