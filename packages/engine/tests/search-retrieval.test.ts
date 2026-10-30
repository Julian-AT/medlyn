import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EvidenceWindow, Segment } from "../contracts.ts";
import type { Db } from "../db/client.ts";
import { embedCorpus } from "../ingest/embed-step.ts";
import { parseSynthArgs } from "../ingest/synth.ts";
import { bm25Query } from "../search/bm25.ts";
import { EMBEDDING_DIM, embed, embeddingContent, normaliseEmbedding } from "../search/embed.ts";
import { relevantSegments, scoreRetrieval } from "../search/eval.ts";
import { reciprocalRankFusion } from "../search/hybrid.ts";
import { rankBm25 } from "../search/lexical.ts";
import { filterWindowHits, searchScope } from "../search/scope.ts";

const window: EvidenceWindow = {
  asOf: "2020-01-01",
  corpusRevision: "rev-a",
  eligibleDocumentIds: ["a"],
};
const hit = (id: string) => ({ segmentId: id, documentId: "a", score: 100 });
const segment = (id: string, text: string, textEn: string | null = null): Segment => ({
  id,
  documentId: "a",
  text,
  textEn,
  kind: "sentence",
  section: null,
  start: 0,
  end: text.length,
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("reciprocal rank fusion", () => {
  it("combines ranks independently of raw scores", () => {
    const result = reciprocalRankFusion([hit("a"), hit("b")], [hit("b"), hit("c")]);
    expect(result[0]).toEqual({ ...hit("b"), score: 1 / 62 + 1 / 61, bm25Rank: 2, vectorRank: 1 });
    expect(result.find((row) => row.segmentId === "c")?.bm25Rank).toBeNull();
  });
  it("does not count duplicate hits twice", () => {
    expect(reciprocalRankFusion([hit("a"), hit("a"), hit("b")], [])).toEqual(
      reciprocalRankFusion([hit("a"), hit("b")], []),
    );
  });
  it("breaks ties deterministically", () => {
    expect(reciprocalRankFusion([hit("b")], [hit("a")]).map((row) => row.segmentId)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("evidence scope", () => {
  it("rejects ineligible documents, revisions and patients", () => {
    const base = { ...hit("s"), patientId: "p", corpusRevision: "rev-a" };
    const result = filterWindowHits(
      [
        base,
        { ...base, documentId: "future" },
        { ...base, corpusRevision: "rev-stale" },
        { ...base, patientId: "other" },
      ],
      window,
      "p",
    );
    expect(result).toEqual([hit("s")]);
  });
  it("parameterizes patient, revision, eligible documents and kind restriction", () => {
    const query = new PgDialect().sqlToQuery(
      searchScope(window, { patientId: "p", kinds: ["lab"] }),
    );
    expect(query.params).toEqual(["a", "rev-a", "p", "p", "p", "lab"]);
    expect(query.sql).toContain("f.location_ok = true");
    expect(query.sql).not.toContain("doc_date");
  });
});

describe("BM25 lexical fallback", () => {
  it("ranks term matches and excludes unrelated segments", () => {
    const ranked = rankBm25("renal", [
      segment("s1", "renal renal"),
      segment("s2", "unrelated"),
      segment("s3", "renal assessment"),
    ]);
    expect(ranked.map((row) => row.segmentId)).toEqual(["s1", "s3"]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
  it("searches translations and normalizes German accents", () => {
    expect(rankBm25("gross", [segment("s1", "groß")])).toHaveLength(1);
    expect(rankBm25("renal", [segment("s1", "Niere", "renal")])).toHaveLength(1);
  });
  it("does not allow user text to introduce ParadeDB field syntax", () => {
    expect(bm25Query('kidney OR patient_id:other "')).toBe(
      'text:"kidney" OR text_en:"kidney" OR text:"OR" OR text_en:"OR" OR text:"patient" OR text_en:"patient" OR text:"id" OR text_en:"id" OR text:"other" OR text_en:"other"',
    );
  });
});

describe("Gemini embedding", () => {
  it("degrades without credentials without making a request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    expect(await embed(["sample"])).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it("skips the ingest embedding step with no key and no database access", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await embedCorpus({} as Db, { patient: { id: "p" }, documents: [] })).toEqual({
      embedded: 0,
      skipped: true,
    });
  });
  it("does not retry authorization errors", async () => {
    const request = vi.fn(async () => new Response("denied", { status: 401 }));
    vi.stubGlobal("fetch", request);
    await expect(embed(["sample"], { apiKey: "test" })).rejects.toThrow("HTTP 401");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses Embedding 2 instructions and leaves multimodal parts unprefixed", () => {
    expect(embeddingContent("renal", "RETRIEVAL_QUERY").parts).toEqual([
      { text: "task: search result | query: renal" },
    ]);
    expect(embeddingContent("renal", "RETRIEVAL_DOCUMENT").parts).toEqual([
      { text: "title: none | text: renal" },
    ]);
    const parts = [{ inlineData: { mimeType: "application/pdf" as const, data: "YQ==" } }];
    expect(embeddingContent({ parts }, "RETRIEVAL_DOCUMENT")).toEqual({ parts });
  });
  it("normalizes vectors and rejects malformed or zero vectors", () => {
    const input = Array.from({ length: EMBEDDING_DIM }, () => 2);
    expect(Math.hypot(...normaliseEmbedding(input))).toBeCloseTo(1);
    expect(() => normaliseEmbedding([1])).toThrow();
    expect(() => normaliseEmbedding(Array(EMBEDDING_DIM).fill(0))).toThrow();
  });
  it("preserves order through bounded batches and uses the REST schema", async () => {
    let active = 0;
    let maximum = 0;
    const request = vi.fn(async (_url: string, init: RequestInit) => {
      active++;
      maximum = Math.max(active, maximum);
      const body = JSON.parse(init.body as string);
      expect(body.requests[0]).toHaveProperty("outputDimensionality", 768);
      expect(body.requests[0]).not.toHaveProperty("taskType");
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return Response.json({
        embeddings: body.requests.map((_: unknown, index: number) => ({
          values: Array.from({ length: EMBEDDING_DIM }, (_, i) => (i === index ? 1 : 0)),
        })),
      });
    });
    vi.stubGlobal("fetch", request);
    const output = await embed(["a", "b", "c", "d", "e"], {
      apiKey: "test",
      batchSize: 2,
      concurrency: 2,
    });
    expect(request).toHaveBeenCalledTimes(3);
    expect(maximum).toBe(2);
    expect(output).toHaveLength(5);
    expect(output?.map((row) => row.indexOf(1))).toEqual([0, 1, 0, 1, 0]);
  });
});

describe("retrieval metrics", () => {
  it("computes recall and truncated reciprocal rank without duplicate credit", () => {
    expect(scoreRetrieval(["x", "a", "a", "b"], ["a", "b", "c"], 3)).toEqual({
      recallAtK: 2 / 3,
      mrr: 0.5,
    });
    expect(scoreRetrieval(["x"], ["a"], 1)).toEqual({ recallAtK: 0, mrr: 0 });
    expect(scoreRetrieval([], [], 1)).toBeNull();
  });
  it("maps only overlapping fact spans to relevant segments", () => {
    expect(
      relevantSegments(
        [{ documentId: "a", start: 2, end: 4 }],
        [segment("s1", "sample"), { ...segment("s2", "sample"), documentId: "b" }],
      ),
    ).toEqual(["s1"]);
  });
});

it("parses synthetic CLI options with independent patient identity", () => {
  expect(
    parseSynthArgs(["--patients", "synth-1,synth-2", "--from", "ml/data/sample", "--no-embed"]),
  ).toMatchObject({ patients: "synth-1,synth-2", noEmbed: true });
  expect(() => parseSynthArgs(["--patients", "0"])).toThrow();
});
