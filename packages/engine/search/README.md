# Retrieval

`hybridSearch(query, window, { k = 20, kinds?, patientId? })` returns segment/document IDs,
RRF scores and 1-based BM25/vector ranks (null when absent). Both branches use the supplied
eligible document IDs and corpus revision, patient isolation, and stale-window checks.
The lens selector still receives every eligible fact; only agent search and absence stage
(a) use retrieval. Similarity alone never establishes documented evidence or absence.

Gemini Embedding 2 uses 768-dimensional normalized vectors and the documented text
retrieval prefixes. `embed()` also accepts image/PDF inline data or Gemini file parts.
It returns null without `GEMINI_API_KEY`; other failures are explicit. Ingestion catches
embedding API failures and preserves BM25 retrieval. The request budget defaults to 80
embedding inputs/minute per process (`GEMINI_EMBED_REQUESTS_PER_MINUTE`), with bounded
concurrency and RetryInfo/Retry-After handling. Query embeddings fail quickly when busy.
Multiple processes share the upstream quota but have independent local budgets.

The configured Neon host currently rejects `CREATE EXTENSION pg_search` as deprecated.
`bm25Search` therefore uses actual BM25 scoring (k1=1.2, b=0.75) over the window's segments
in process. The ParadeDB 0.15 SQL path is included for hosts that allow the extension.
Vector retrieval ranks the eligible set exactly to avoid HNSW post-filter recall loss;
HNSW cosine indexes are provisioned for future broader search workloads.

Run from repository root:

```sh
node --env-file=.env --experimental-strip-types packages/engine/db/migrations-extra/apply.ts --extensions-only
pnpm db:push
node --env-file=.env --experimental-strip-types packages/engine/db/migrations-extra/apply.ts
node --env-file=.env --experimental-strip-types packages/engine/search/backfill.ts
node --env-file=.env --experimental-strip-types packages/engine/ingest/synth.ts --patients 100 --from ml/data/synth-v1
```

Backfill accepts a patient ID as its first argument. Synthetic ingest accepts a count or
comma-separated IDs, `--no-embed`, and `--wait-seconds`. It reads shards directly,
materializes temporary challenge-shaped files, uses the existing ingest functions, and
sets LLM concurrency to 3. Labels are never supplied to the ingest models. Synthetic IDs
and corpus revisions are isolated from the default challenge patient. Document IDs that
lack the patient prefix receive it; callers using label spans must apply the same prefix.

`evaluateRetrieval(cases, mode, k)` supports `bm25`, `vector`, and `hybrid`; relevance can
be segment IDs or normalized document spans. It returns per-case scores, macro recall@k
and MRR truncated at k; cases with no eligible relevance labels are skipped.

```sh
pnpm --filter @medlyn/engine exec vitest run tests/search-retrieval.test.ts tests/absence-rules.test.ts
node --env-file=.env packages/engine/node_modules/vitest/vitest.mjs run packages/engine/tests/search-live.test.ts
```

Official API references: https://ai.google.dev/gemini-api/docs/embeddings and
https://ai.google.dev/api/embeddings. ParadeDB SQL verified against the v0.15.0 upstream
query tests: https://github.com/paradedb/paradedb/blob/v0.15.0/tests/tests/query.rs.
