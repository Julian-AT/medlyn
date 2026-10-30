import { describe, expect, it } from "vitest";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/validate.ts";
import type { Fact, Need, Segment } from "../contracts.ts";
import { batchCandidateSearch } from "../lens/absence-search.ts";
import { lensCacheKey } from "../lens/cache.ts";
import { CHIPS } from "../lens/needs/profiles.ts";
import { renderCard } from "../lens/render.ts";
import { patientView } from "../lens/screen.ts";

const window = {
  asOf: "2025-01-01",
  corpusRevision: "revision-test",
  eligibleDocumentIds: ["doc-test"],
};
const text = "Example Person, geb. am 04.05.1982";
const source: Segment = {
  id: "doc-test-s0",
  documentId: "doc-test",
  kind: "sentence",
  section: null,
  start: 0,
  end: text.length,
  text,
  textEn: null,
};

const fact: Fact = {
  id: "test-fact",
  segmentId: source.id,
  documentId: source.documentId,
  kind: "measurement",
  labelEn: "Synthetic marker",
  attrs: {},
  assertion: "present",
  temporalStatus: "stated",
  eventDate: null,
  datePrecision: null,
  dueDate: null,
  docDate: window.asOf,
  quote: text,
  start: 0,
  end: text.length,
  entityId: null,
  locationOk: true,
  support: "supported",
  negationFlag: false,
  contentHash: "synthetic-hash",
  validatorVersion: "test",
};
const need: Need = {
  id: "test",
  title: "Synthetic marker",
  why: "Test",
  kinds: ["measurement"],
  cardType: "facts",
  critical: false,
  synonyms: [],
};

describe("patient identity through the lens", () => {
  it("derives the selected patient's name and located birth date from its source", () => {
    expect(patientView([source], "synth-one")).toEqual({
      id: "synth-one",
      displayName: "Example Person",
      sex: "X",
      birthDate: "1982-05-04",
      birthDateQuote: "geb. am 04.05.1982",
      birthDateSegmentId: source.id,
    });
    expect(
      patientView([{ ...source, text: "Herr Another Person, geb. 06.07.1970" }], "synth-two"),
    ).toMatchObject({
      id: "synth-two",
      displayName: "Another Person",
      sex: "M",
      birthDate: "1970-07-06",
    });
  });

  it("never supplies a fixed real-patient name or an unlocated birth date", () => {
    expect(() => patientView([], "synth-one")).toThrow("no located eligible source");
    expect(() => patientView([{ ...source, text: "geb. am 04.05.1982" }], "synth-one")).toThrow(
      "Patient name has no located eligible source",
    );
  });

  it("includes patient identity even when all other cache inputs are identical", () => {
    const situation = CHIPS[0].situation;
    const one = lensCacheKey(situation, window, [fact], [source], "synth-one");
    expect(lensCacheKey(situation, window, [fact], [source], "synth-two")).not.toBe(one);
    expect(lensCacheKey(situation, window, [fact], [source], "synth-one")).toBe(one);
  });

  it("passes the patient's identity to the shared claim boundary", async () => {
    const selection = {
      needId: need.id,
      factIds: [fact.id],
      completeness: "complete" as const,
      missing: [],
      headline: null,
    };
    const validatedLines = new Map();
    const ctx = { window, facts: [fact], segments: [source], findings: [], validatedLines };
    const first = await renderCard(need, selection, { ...ctx, patientId: "synth-one" });
    const second = await renderCard(need, selection, { ...ctx, patientId: "synth-two" });
    expect(validatedLines.size).toBe(2);
    await renderCard(need, selection, { ...ctx, patientId: "synth-one" });
    expect(validatedLines.size).toBe(2);
    const line = first.card.lines[0];
    expect(line.validation.support).toBe("supported");
    expect(line.validation.key).not.toBe(second.card.lines[0].validation.key);
    expect(line.validation.key).toBe(
      cacheKey({
        patientId: "synth-one",
        ...window,
        validatorVersion: VALIDATOR_VERSION,
        text: line.text,
        facts: [{ id: fact.id, contentHash: fact.contentHash }],
        segmentIds: [source.id],
      }),
    );
  });

  it("scopes coalesced absence retrieval to the requested patient", async () => {
    const search = batchCandidateSearch(
      window,
      async (_query, scope, options) => {
        expect(scope).toBe(window);
        expect(options?.patientId).toBe("synth-one");
        return [];
      },
      "synth-one",
    );
    expect(await Promise.all([search("first"), search("second")])).toEqual([[], []]);
  });
});
