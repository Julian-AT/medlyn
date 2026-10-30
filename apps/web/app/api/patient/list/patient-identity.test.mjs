import { describe, expect, it } from "vitest";
import { identityFromDocuments } from "./patient-identity.ts";

const patient = {
  id: "synth-0123",
  displayName: "synth-0123",
  sex: "X",
  birthDate: null,
  asOf: "2020-01-01",
  documentCount: 2,
};

describe("generated document identity", () => {
  it("preserves the registered case identity over document placeholders", () => {
    const registered = { ...patient, id: "patient-0000-0001", displayName: "Anna Musterfrau" };
    expect(identityFromDocuments(registered, ["Example Placeholder, geb. am 02.03.1960"])).toEqual(
      registered,
    );
  });
  it("reads a name and date from a generated header", () => {
    const result = identityFromDocuments(patient, [
      "Example Person, geb. am 02.03.1960\nGeschlecht: female\n",
    ]);
    expect(result.displayName).toBe("Example Person");
    expect(result.birthDate).toBe("1960-03-02");
    expect(result.sex).toBe("F");
  });
  it("accepts labelled headers with German honorifics", () => {
    expect(
      identityFromDocuments(patient, ["Patient: Herr Example Person, born 2.3.1960"]).displayName,
    ).toBe("Example Person");
  });
  it("falls back when the header is missing or birth date is invalid", () => {
    expect(identityFromDocuments(patient, ["Example Person, geb. am 31.02.1960"]).displayName).toBe(
      "Synthetic patient 0123",
    );
    expect(identityFromDocuments(patient, []).birthDate).toBeNull();
  });
  it("does not invent a sex when source cues conflict", () => {
    expect(
      identityFromDocuments(patient, ["Example Person, geb. am 02.03.1960\nfemale male"]).sex,
    ).toBe("X");
  });
});
