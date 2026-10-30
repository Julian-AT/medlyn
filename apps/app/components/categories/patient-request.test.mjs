import { describe, expect, it } from "vitest";
import { PatientRequestError, patientQuery } from "../../app/api/patient/request-values.ts";

const read = (query) => patientQuery(new URLSearchParams(query), "patient-example");
describe("patient query validation", () => {
  it("uses the configured patient and the store default date", () => {
    expect(read("")).toEqual({ patientId: "patient-example", asOf: undefined, kinds: undefined });
  });
  it("accepts a patient identifier, fact kind and leap date", () => {
    expect(read("patientId=patient-other&kind=lab&asOf=2020-02-29")).toEqual({
      patientId: "patient-other",
      asOf: "2020-02-29",
      kinds: ["lab"],
    });
  });
  it.each(["2020-02-30", "2021-02-29", "2020-13-01", "20-01-01", "", "not-a-date"])(
    "rejects invalid as-of date %s",
    (asOf) => {
      expect(() => read(`asOf=${encodeURIComponent(asOf)}`)).toThrow(PatientRequestError);
    },
  );
  it.each(["", "../patient", "patient%20example", "x".repeat(101)])(
    "rejects invalid patient identifiers %s",
    (patientId) => {
      expect(() => read(`patientId=${patientId}`)).toThrow(PatientRequestError);
    },
  );
  it("rejects unknown fact kinds before querying the store", () => {
    expect(() => read("kind=unknown")).toThrow("Invalid fact kind");
  });
  it("treats an empty kind as an unfiltered request", () => {
    expect(read("kind=").kinds).toBeUndefined();
  });
});
