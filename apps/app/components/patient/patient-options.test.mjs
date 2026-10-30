import { describe, expect, it } from "vitest";
import {
  patientAge,
  patientSexLabel,
  readablePatientName,
  uniquePatients,
} from "./patient-options.ts";

const option = (id, displayName) => ({
  id,
  displayName,
  sex: "X",
  birthDate: null,
  asOf: "2020-01-01",
  documentCount: 2,
});

describe("patient menu identities", () => {
  it("deduplicates ids and preserves distinct patients with the same name", () => {
    const result = uniquePatients([
      option("synth-0123", "synth-0123"),
      option("synth-0123", "Example Person"),
      option("synth-0124", "Example Person"),
    ]);
    expect(result.map((p) => p.id)).toEqual(["synth-0123", "synth-0124"]);
    expect(result[0].displayName).toBe("Example Person");
  });
  it.each(["", "synth-0123", "Unknown", "—"])("replaces missing name %s", (name) => {
    expect(readablePatientName("synth-0123", name)).toBe("Synthetic patient 0123");
  });
  it("places the case patient first", () => {
    expect(
      uniquePatients([
        option("synth-1", "A Person"),
        option("patient-0000-0001", "Case patient"),
      ])[0].id,
    ).toBe("patient-0000-0001");
  });
  it("renders full sex labels", () => {
    expect([patientSexLabel("F"), patientSexLabel("M"), patientSexLabel("X")]).toEqual([
      "Female",
      "Male",
      "—",
    ]);
  });
  it("calculates age at the evidence date and handles invalid dates", () => {
    expect(patientAge("1960-04-16", "2020-04-15")).toBe(59);
    expect(patientAge("1960-04-15", "2020-04-15")).toBe(60);
    expect(patientAge("1960-02-30", "2020-04-15")).toBeNull();
    expect(patientAge(null, "2020-04-15")).toBeNull();
    expect(patientAge("2021-01-01", "2020-01-01")).toBeNull();
  });
});
