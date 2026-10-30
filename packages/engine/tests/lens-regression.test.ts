import { describe, expect, it } from "vitest";
import type { Fact, Need, Segment } from "../contracts.ts";
import { batchCandidateSearch, validateAbsenceBatch } from "../lens/absence-search.ts";
import { missingFieldLabels } from "../lens/fields.ts";
import { matchProfile } from "../lens/needs/profiles.ts";
import { patientView } from "../lens/screen.ts";
import { expandFactAliases, validateSelections } from "../lens/select.ts";
import { factLineText, trendLines } from "../lens/templates.ts";

const need: Need = {
  id: "test",
  title: "Synthetic",
  why: "Test",
  kinds: ["measurement"],
  cardType: "facts",
  critical: false,
  synonyms: [],
  requiredFields: ["value", "date"],
};
const segment: Segment = {
  id: "d-s0",
  documentId: "d",
  kind: "sentence",
  section: null,
  start: 0,
  end: 32,
  text: "Synthetic patient geb. 09.02.1980",
  textEn: null,
};

describe("regression safety", () => {
  it("shares simultaneous hybrid retrieval while keeping its evidence window", async () => {
    const window = { asOf: "2020-01-01", corpusRevision: "r", eligibleDocumentIds: ["d"] };
    const requests: string[] = [];
    const search = batchCandidateSearch(window, async (query, scope) => {
      requests.push(query);
      expect(scope).toBe(window);
      return [{ segmentId: "d-s0", documentId: "d", score: 1, bm25Rank: 1, vectorRank: null }];
    });
    expect(await Promise.all([search("alpha"), search("beta")])).toEqual([["d-s0"], ["d-s0"]]);
    expect(requests).toEqual(["alpha\nbeta"]);
  });

  it("allows only catalog field identifiers and renders fixed labels", () => {
    const [selection] = validateSelections(
      {
        needs: [
          {
            needId: "test",
            factIds: [],
            completeness: "complete",
            missing: ["Synthetic unsupported claim", "date", "date"],
            headline: null,
          },
        ],
      },
      [need],
      [],
    );
    expect(selection.missing).toEqual(["date"]);
    expect(selection.completeness).toBe("partial");
    expect(missingFieldLabels(need, ["date", "Synthetic unsupported claim"])).toEqual(["Date"]);
  });

  it("expands compact model aliases to the original fact and headline identities", () => {
    const expanded = expandFactAliases(
      {
        needs: [
          {
            needId: "test",
            factIds: ["1", "unknown"],
            completeness: "complete",
            missing: [],
            headline: { text: "Synthetic", factIds: ["1"] },
          },
        ],
      },
      new Map([["1", "original-fact-id"]]),
    );
    expect(expanded.needs[0].factIds).toEqual(["original-fact-id", "unrecognised:unknown"]);
    expect(expanded.needs[0].headline?.factIds).toEqual(["original-fact-id"]);
  });

  it("lets an explicit discharge follow-up task select its profile for a GP", () => {
    expect(matchProfile("GP", "Check open follow-ups from the hospital stay")?.id).toBe(
      "open_followups",
    );
    expect(matchProfile("GP", "Diabetes review")?.id).toBe("gp_diabetes");
    expect(matchProfile("Medical oncologist", "Routine Nachsorge review")?.id).toBe(
      "medical_oncologist",
    );
  });

  it("requires a located birth-date passage and derives its date", () => {
    expect(patientView([segment])).toMatchObject({
      birthDate: "1980-02-09",
      birthDateQuote: "geb. 09.02.1980",
      birthDateSegmentId: "d-s0",
    });
    expect(() => patientView([])).toThrow("no located eligible source");
    expect(() => patientView([{ ...segment, text: "geb. 31.02.1980" }])).toThrow();
  });

  it("requires exactly one full-text result for every requested concept", () => {
    expect(
      validateAbsenceBatch(
        ["alpha", "beta"],
        [
          { concept: "alpha", matches: [{ segmentId: segment.id, quote: "Synthetic" }] },
          { concept: "beta", matches: [] },
        ],
        [segment],
      ),
    ).toEqual(
      new Map([
        ["alpha", [segment.id]],
        ["beta", []],
      ]),
    );
    expect(() =>
      validateAbsenceBatch(["alpha", "beta"], [{ concept: "alpha", matches: [] }], [segment]),
    ).toThrow("omitted");
    expect(() =>
      validateAbsenceBatch(
        ["alpha"],
        [
          { concept: "alpha", matches: [] },
          { concept: "alpha", matches: [] },
        ],
        [segment],
      ),
    ).toThrow("duplicate");
    expect(() =>
      validateAbsenceBatch(
        ["alpha"],
        [{ concept: "alpha", matches: [{ segmentId: segment.id, quote: "invented" }] }],
        [segment],
      ),
    ).toThrow("unlocated");
  });

  it("keeps the recorded reason and the encounter date in faithful fact templates", () => {
    const weight: Fact = {
      id: "w",
      segmentId: "d-s1",
      documentId: "d",
      kind: "measurement",
      labelEn: "Weight",
      attrs: { value: 84, unit: "kg" },
      assertion: "present",
      temporalStatus: "stated",
      eventDate: null,
      datePrecision: null,
      dueDate: null,
      docDate: "2020-02-02",
      quote: "Synthetic weight 84 kg",
      start: 0,
      end: 22,
      entityId: null,
      locationOk: true,
      support: "supported",
      negationFlag: false,
      contentHash: "h",
      validatorVersion: "v",
    };
    const encounter: Fact = {
      ...weight,
      id: "e",
      kind: "event",
      labelEn: "Outpatient visit",
      attrs: {},
      eventDate: "2020-02-01",
      datePrecision: "day",
      temporalStatus: "done",
    };
    const ctx = {
      patientId: "p",
      window: { asOf: "2020-02-02", corpusRevision: "r", eligibleDocumentIds: ["d"] },
    };
    const lines = trendLines([weight, encounter], ctx);
    expect(lines.map((line) => line.factIds)).toEqual([["e"], ["w"]]);
    expect(lines[0].text).toContain("1 Feb 2020");
    expect(lines[1].text).toContain("2 Feb 2020");
    expect(lines.every((line) => line.kind === "template")).toBe(true);
    expect(
      factLineText({
        ...weight,
        kind: "receptor",
        labelEn: "Synthetic receptor positive",
        attrs: { value: "90%", allredScore: "6" },
      }),
    ).toContain("90%, Allred 6");
    expect(
      factLineText({
        ...weight,
        kind: "staging",
        labelEn: "Synthetic histologic grade",
        attrs: { stage: "G1" },
      }),
    ).toContain("grade G1");
    expect(
      factLineText({
        ...weight,
        kind: "procedure",
        labelEn: "Synthetic procedure",
        attrs: { cause: "Synthetic reason" },
      }),
    ).toContain("reason: Synthetic reason");
    expect(
      factLineText({
        ...weight,
        kind: "procedure",
        labelEn: "Synthetic procedure",
        attrs: { cause: "possible contrast allergy" },
      }),
    ).toContain("reason: possible contrast allergy");
  });
});
