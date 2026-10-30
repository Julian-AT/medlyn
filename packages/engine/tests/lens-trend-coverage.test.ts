import { describe, expect, it } from "vitest";
import type { Fact } from "../contracts.ts";
import { NEEDS } from "../lens/needs/catalog.ts";
import { emptySelection, validateSelections } from "../lens/select.ts";

const point = (id: string, value: number): Fact => ({
  id,
  kind: "measurement",
  labelEn: "Weight",
  attrs: { value, unit: "kg" },
  segmentId: `${id}-s0`,
  documentId: id,
  assertion: "present",
  temporalStatus: "stated",
  eventDate: null,
  datePrecision: null,
  dueDate: null,
  docDate: "2025-01-01",
  quote: `Synthetic weight ${value} kg`,
  start: 0,
  end: 22,
  entityId: null,
  locationOk: true,
  support: "supported",
  negationFlag: false,
  contentHash: id,
  validatorVersion: "test",
});

describe("weight trend coverage", () => {
  it("retains located documented endpoints omitted by selection", () => {
    const need = NEEDS.weight_trend;
    const facts = [point("first", 81), point("middle", 73), point("last", 69)];
    const selection = { ...emptySelection(need), factIds: ["first", "middle"] };
    expect(validateSelections({ needs: [selection] }, [need], facts)[0].factIds).toEqual([
      "first",
      "middle",
      "last",
    ]);
  });
  it("excludes plans, negations, unsupported values and unrelated measurements", () => {
    const need = NEEDS.weight_trend;
    const facts: Fact[] = [
      point("actual", 81),
      { ...point("plan", 70), temporalStatus: "planned" },
      { ...point("negated", 70), assertion: "negated" },
      { ...point("unsupported", 70), support: "unsupported" },
      { ...point("bmi", 28), labelEn: "BMI", attrs: { value: 28, unit: "kg/m²" } },
    ];
    expect(validateSelections({ needs: [] }, [need], facts)[0].factIds).toEqual(["actual"]);
  });
});
