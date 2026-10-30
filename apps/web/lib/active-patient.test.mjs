import { describe, expect, it } from "vitest";
import {
  DEFAULT_PATIENT_ID,
  PATIENT_COOKIE,
  patientIdFromRequest,
  validPatientId,
} from "./active-patient.ts";

describe("active patient identity", () => {
  it("keeps the established patient cookie and default", () => {
    expect(PATIENT_COOKIE).toBe("medlyn-patient");
    expect(DEFAULT_PATIENT_ID).toBe("patient-0000-0001");
  });
  it.each(["patient-0000-0001", "synth-000010", "patient_example"])("accepts %s", (id) => {
    expect(validPatientId(id)).toBe(true);
  });
  it.each(["", "../patient", "patient; Path=/", "a".repeat(101), null, undefined])(
    "rejects invalid input %s",
    (id) => {
      expect(validPatientId(id)).toBe(false);
    },
  );
  it("uses the default when the cookie is missing or invalid", () => {
    expect(patientIdFromRequest(new Request("http://localhost"))).toBe(DEFAULT_PATIENT_ID);
    expect(
      patientIdFromRequest(
        new Request("http://localhost", { headers: { cookie: "medlyn-patient=../invalid" } }),
      ),
    ).toBe(DEFAULT_PATIENT_ID);
  });
  it("reads the selected patient alongside unrelated cookies", () => {
    expect(
      patientIdFromRequest(
        new Request("http://localhost", {
          headers: { cookie: "theme=dark; medlyn-patient=synth-000001; other=value" },
        }),
      ),
    ).toBe("synth-000001");
  });
});
