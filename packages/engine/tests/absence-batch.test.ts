import { afterEach, describe, expect, it, vi } from "vitest";
import type { Document, Segment } from "../contracts.ts";
import { locatedAbsenceHits } from "../lens/absence.ts";
import { batchDocumentSearch, settledAbsenceBatch } from "../lens/absence-search.ts";

const document: Document & { normText: string } = {
  id: "synthetic-doc",
  patientId: "synthetic",
  revisionId: "synthetic-rev",
  title: "Synthetic",
  titleEn: "Synthetic",
  docType: "test",
  docDate: "2020-01-01",
  department: "Test",
  normText: "Synthetic marker.",
};
const segment: Segment = {
  id: "synthetic-doc-s0",
  documentId: document.id,
  kind: "sentence",
  section: null,
  start: 0,
  end: document.normText.length,
  text: document.normText,
  textEn: null,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("request absence batch", () => {
  it("repairs a segment reference only for an exact unique quote in the same eligible document", () => {
    const neighbour = { ...segment, id: "synthetic-doc-s1", text: "Another synthetic marker." };
    expect(
      locatedAbsenceHits([{ segmentId: segment.id, quote: neighbour.text }], [segment, neighbour]),
    ).toEqual([neighbour.id]);
    expect(() =>
      locatedAbsenceHits(
        [{ segmentId: segment.id, quote: neighbour.text }],
        [segment, { ...neighbour, documentId: "other" }],
      ),
    ).toThrow("unlocated");
    expect(() =>
      locatedAbsenceHits(
        [{ segmentId: segment.id, quote: neighbour.text }],
        [segment, neighbour, { ...neighbour, id: "duplicate" }],
      ),
    ).toThrow("unlocated");
  });
  it("reuses one full-document call when a second gap is discovered after selection", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic");
    const fetch = vi.fn(async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const input = JSON.parse(body.messages[1].content);
      expect(input.documents[0].text).toBe(document.normText);
      expect(input.concepts).toHaveLength(2);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  results: [
                    { concept: "1", matches: [] },
                    { concept: "2", matches: [] },
                  ],
                }),
              },
            },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const search = batchDocumentSearch([
      { concept: "alpha", synonyms: [] },
      { concept: "beta", synonyms: [] },
    ]);
    expect(await search("alpha", [document], [segment])).toEqual([]);
    expect(await search("beta", [document], [segment])).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("isolates an invalid positive quote without losing a complete negative proof for another concept", () => {
    const results = settledAbsenceBatch(
      ["alpha", "beta"],
      [
        { concept: "alpha", matches: [{ segmentId: segment.id, quote: "Invented" }] },
        { concept: "beta", matches: [] },
      ],
      [segment],
    );
    expect(results.get("alpha")).toBeInstanceOf(Error);
    expect(results.get("beta")).toEqual([]);
    expect(() =>
      settledAbsenceBatch(["alpha", "beta"], [{ concept: "alpha", matches: [] }], [segment]),
    ).toThrow("omitted");
  });
});
