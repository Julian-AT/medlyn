import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Document, Segment } from "../contracts.ts";
import { checkDocumented, locatedAbsenceHits } from "../lens/absence.ts";
import { retrieveAbsenceCandidates } from "../lens/absence-retrieval.ts";
import { batchCandidateSearch } from "../lens/absence-search.ts";
import { rankBm25 } from "../search/lexical.ts";

const transport = vi.hoisted(() => ({
  lexical: vi.fn(),
  vector: vi.fn(),
  guard: vi.fn(),
  coverage: vi.fn(),
}));
vi.mock("../search/bm25.ts", () => ({ bm25Search: transport.lexical }));
vi.mock("../search/vector.ts", () => ({ vectorSearch: transport.vector }));
vi.mock("../store.ts", async (original) => ({
  ...(await original<typeof import("../store.ts")>()),
  assertWindowCurrent: transport.guard,
}));
vi.mock("../db/client.ts", () => ({
  getDb: () => {
    const query = {
      from: () => query,
      innerJoin: () => query,
      leftJoin: () => query,
      where: () => query,
      limit: transport.coverage,
    };
    return { select: () => query };
  },
}));

const window = { asOf: "2025-01-01", corpusRevision: "r1", eligibleDocumentIds: ["d"] };
const document: Document & { normText: string } = {
  id: "d",
  patientId: "synth-fallback",
  revisionId: "r1",
  title: "Synthetic",
  titleEn: "Synthetic",
  docType: "test",
  docDate: window.asOf,
  department: "Test",
  normText: "Marker alpha.",
};
const segment: Segment = {
  id: "d-s0",
  documentId: "d",
  kind: "sentence",
  section: null,
  start: 0,
  end: document.normText.length,
  text: document.normText,
  textEn: null,
};
const sources = {
  patientId: document.patientId,
  documents: [document],
  segments: [segment],
  total: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DATABASE_URL", "synthetic-test");
  vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
  transport.guard.mockResolvedValue(undefined);
  transport.lexical.mockImplementation(async (query: string) => rankBm25(query, [segment]));
  transport.vector.mockRejectedValue(new Error("Gemini embedding HTTP 429"));
  transport.coverage.mockResolvedValue([]);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("absence retrieval fallback", () => {
  it("proves absence after vector 429 and a complete negative lexical/full-text check", async () => {
    const candidateSearch = batchCandidateSearch(window, undefined, document.patientId);
    const result = await checkDocumented("missing token", [], window, {
      ...sources,
      candidateSearch,
      search: async (_concept, documents, segments) => {
        expect(documents).toEqual([document]);
        expect(segments).toEqual([segment]);
        return [];
      },
    });
    expect(result.status).toBe("not_documented");
    expect(result.details).toEqual({ retrieval: "lexical_fallback" });
    expect(result.segmentIds).toEqual([]);
    expect(transport.vector).toHaveBeenCalledOnce();
    expect(transport.lexical).toHaveBeenCalledOnce();
  });

  it("shares the fallback flag across every concept in a retrieval batch", async () => {
    const candidateSearch = batchCandidateSearch(window, undefined, document.patientId);
    const results = await Promise.all(
      ["missing one", "missing two"].map((concept) =>
        checkDocumented(concept, [], window, {
          ...sources,
          candidateSearch,
          search: async () => [],
        }),
      ),
    );
    expect(results.map(({ status, details }) => ({ status, details }))).toEqual([
      { status: "not_documented", details: { retrieval: "lexical_fallback" } },
      { status: "not_documented", details: { retrieval: "lexical_fallback" } },
    ]);
    expect(transport.vector).toHaveBeenCalledOnce();
  });

  it("falls back with no vector key and still searches lexically", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const result = await retrieveAbsenceCandidates("alpha", window, {
      patientId: document.patientId,
    });
    expect(result.retrieval).toBe("lexical_fallback");
    expect(result.hits.map((hit) => hit.segmentId)).toEqual([segment.id]);
    expect(transport.vector).not.toHaveBeenCalled();
  });

  it("flags incomplete embeddings while retaining positive vector candidates", async () => {
    transport.vector.mockResolvedValue([{ segmentId: segment.id, documentId: "d", score: 1 }]);
    transport.coverage.mockResolvedValue([{ id: "d-s1" }]);
    const result = await retrieveAbsenceCandidates("missing", window);
    expect(result.retrieval).toBe("lexical_fallback");
    expect(result.hits.map((hit) => hit.segmentId)).toEqual([segment.id]);
  });

  it("reports hybrid retrieval when both legs and vector coverage succeed", async () => {
    transport.vector.mockResolvedValue([]);
    const result = await retrieveAbsenceCandidates("missing", window);
    expect(result).toEqual({ hits: [], retrieval: "hybrid" });
  });

  it("falls back before a stalled vector leg can exhaust the full absence deadline", async () => {
    vi.useFakeTimers();
    transport.vector.mockImplementation(() => new Promise(() => undefined));
    const pending = checkDocumented("missing token", [], window, {
      ...sources,
      search: async () => [],
    });
    await vi.advanceTimersByTimeAsync(4_000);
    const result = await pending;
    expect(result.status).toBe("not_documented");
    expect(result.details?.retrieval).toBe("lexical_fallback");
  });

  it("retains positive lexical evidence during vector fallback", async () => {
    const result = await checkDocumented("alpha", [], window, {
      ...sources,
      search: async () => [],
    });
    expect(result.status).toBe("documented");
    expect(result.segmentIds).toEqual([segment.id]);
    expect(result.details?.retrieval).toBe("lexical_fallback");
  });

  it("does not treat a vector similarity hit as located proof of documentation", async () => {
    transport.vector.mockResolvedValue([{ segmentId: segment.id, documentId: "d", score: 1 }]);
    const result = await checkDocumented("missing token", [], window, {
      ...sources,
      search: async () => [],
    });
    expect(result.status).toBe("not_documented");
    expect(result.segmentIds).toEqual([]);
  });

  it("keeps a located full-text hit when vector retrieval fails", async () => {
    const result = await checkDocumented("other phrase", [], window, {
      ...sources,
      search: async () =>
        locatedAbsenceHits([{ segmentId: segment.id, quote: "alpha" }], [segment]),
    });
    expect(result.status).toBe("documented");
    expect(result.segmentIds).toEqual([segment.id]);
    expect(result.details?.retrieval).toBe("lexical_fallback");
  });

  it("requires quote location for positive full-text hits during fallback", async () => {
    const result = await checkDocumented("other phrase", [], window, {
      ...sources,
      search: async () =>
        locatedAbsenceHits([{ segmentId: segment.id, quote: "invented" }], [segment]),
    });
    expect(result.status).toBe("unavailable");
  });

  it("keeps full-text pass failures unavailable during vector fallback", async () => {
    const result = await checkDocumented("missing token", [], window, {
      ...sources,
      search: async () => {
        throw new Error("LLM transport failed");
      },
    });
    expect(result.status).toBe("unavailable");
    expect(result.segmentIds).toEqual([]);
  });

  it("keeps lexical retrieval errors unavailable after a negative full-text pass", async () => {
    transport.lexical.mockRejectedValue(new Error("Lexical scan failed"));
    const result = await checkDocumented("missing token", [], window, {
      ...sources,
      search: async () => [],
    });
    expect(result.status).toBe("unavailable");
  });

  it("does not swallow a stale evidence window guard as vector degradation", async () => {
    transport.guard.mockResolvedValueOnce(undefined).mockRejectedValue(new Error("Stale window"));
    const result = await checkDocumented("missing token", [], window, {
      ...sources,
      search: async () => [],
    });
    expect(result.status).toBe("unavailable");
  });

  it("scans every segment even when retrieval returns no candidates", async () => {
    const result = await checkDocumented("translated marker", [], window, {
      ...sources,
      segments: [{ ...segment, textEn: "Translated marker." }],
      candidateSearch: async () => ({ segmentIds: [], retrieval: "lexical_fallback" }),
      search: async () => [],
    });
    expect(result.status).toBe("documented");
    expect(result.segmentIds).toEqual([segment.id]);
  });
});
