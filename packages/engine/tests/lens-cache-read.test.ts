import type { NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../db/client.ts";
import * as schema from "../db/schema.ts";
import { getRequestCache } from "../lens/cache.ts";
import { mockLensEvents } from "../lens/mock.ts";
import { screenFromEvents } from "../lens/screen.ts";

let database: Db;
vi.mock("../db/client.ts", () => ({ getDb: () => database }));
const screen = screenFromEvents(mockLensEvents);
let rows: unknown[][];
let queries: { sql: string; params: unknown[] }[];
beforeEach(() => {
  rows = [[screen.lensKey, screen]];
  queries = [];
  const client = async (sql: string, params: unknown[]) => {
    queries.push({ sql, params });
    return { rows };
  };
  database = drizzle({ client: client as unknown as NeonQueryFunction<false, false>, schema });
});

describe("cached screen replay", () => {
  it("reads a single canonical screen with a patient-scoped revision guard and no evidence reload", async () => {
    expect(await getRequestCache({ text: "Synthetic task" })).toEqual(screen);
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain('from "lens_cache"');
    expect(queries[0].sql).toContain('from "corpus_revisions"');
    expect(queries[0].sql).toContain('"corpus_revisions"."patient_id"');
    expect(queries[0].sql).not.toContain('from "facts"');
    expect(queries[0].sql).not.toContain('from "findings"');
    expect(queries[0].sql).not.toContain('from "documents"');
  });

  it("rejects a cached screen from another patient, a mismatched canonical key or a stale query miss", async () => {
    expect(await getRequestCache({ text: "Synthetic task", patientId: "another" })).toBeNull();
    rows = [["wrong-key", screen]];
    expect(await getRequestCache({ text: "Synthetic task" })).toBeNull();
    rows = [];
    expect(await getRequestCache({ text: "Synthetic task" })).toBeNull();
  });
});
