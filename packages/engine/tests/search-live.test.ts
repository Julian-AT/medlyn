import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "../db/client.ts";
import { hybridSearch } from "../search/hybrid.ts";
import { vectorSearch } from "../search/vector.ts";
import { evidenceWindow } from "../store.ts";

describe.skipIf(!process.env.DATABASE_URL)("live scoped retrieval", () => {
  it("rejects stale revisions rather than returning replacement evidence", async () => {
    const window = await evidenceWindow();
    await expect(
      hybridSearch("medication", { ...window, corpusRevision: "rev-does-not-exist" }),
    ).rejects.toThrow("stale or incomplete");
  });

  it("keeps every returned row in the authoritative evidence set", async () => {
    const window = await evidenceWindow("2015-12-31");
    const hits = await hybridSearch("medication aspirin weight", window);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => window.eligibleDocumentIds.includes(hit.documentId))).toBe(true);
    const rows = await getDb().execute(sql`
      select s.id from segments s join documents d on s.document_id = d.id
      where d.revision_id = ${window.corpusRevision} and d.id in (
        ${sql.join(
          window.eligibleDocumentIds.map((id) => sql`${id}`),
          sql`, `,
        )}
      )
    `);
    const allowed = new Set(rows.rows.map((row) => row.id));
    expect(hits.every((hit) => allowed.has(hit.segmentId))).toBe(true);
  }, 15_000);

  it("serves BM25 hits with no embedding credentials", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    try {
      const window = await evidenceWindow();
      const hits = await hybridSearch("medication weight", window);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((hit) => hit.vectorRank === null)).toBe(true);
      expect(await vectorSearch("medication", window)).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
