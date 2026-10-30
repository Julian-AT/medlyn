# Decisions

Approved implementation decisions and departures from [PRD v3](PRD.md). Entries
are chronological; later entries supersede earlier ones where they conflict.
Historical rows remain intact so the original constraints and subsequent changes
are reviewable. Current operating rules live in [AGENTS.md](../AGENTS.md);
measurements and delivery gaps live in [status](status.md).

## Original decision log

Dates below are 30 October 2026. These rows were moved from the root agent guide.

| Date   | Decision                                                                                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 Oct | pnpm only (see Toolchain)                                                                                                                                                                                                                                         |
| 30 Oct | Push-to-talk uses the browser's speech recognition, and only if it integrates cleanly: feature-detected, the orb hidden when unsupported, no polyfill or extra dependency. The transcript goes through the same path as typed text. Otherwise voice input is cut. |
| 30 Oct | Chips skip the parse call (see Models and latency)                                                                                                                                                                                                                |
| 30 Oct | `eval/` is a workspace package (`@medlyn/eval`); engine exports `"./*": "./*.ts"` so the web app imports engine modules by path                                                                                                                                   |
| 30 Oct | Engine LLM calls use a thin fetch client (`llm/client.ts`, JSON-schema + Zod, one retry); AI SDK v7 is used only for the Ask Medlyn agent route and dock                                                                                                          |
| 30 Oct | PRD v3 approves A+ in parallel with Part A; former Part C moves into A+. Hard limit three hours, integrate T+1:30, freeze T+2:30; real regression/demo retain priority.                                                                                           |
| 30 Oct | All visible UI is shadcn-only; preset `b1aIcEuKO`, `dashboard-01` shell; assistant-ui supplies dock runtime/structure.                                                                                                                                            |
| 30 Oct | Hybrid search stays in Neon: pgvector + ParadeDB `pg_search` BM25, reciprocal rank fusion; absence stage (a) and agent search share the store evidence window. Full-text absence pass stays.                                                                      |
| 30 Oct | Multimodal ingest extracts PDF/scan text with page boxes and runs normal quote location; Gemini Embedding 2 text/page vectors support retrieval only.                                                                                                             |
| 30 Oct | 100k synthetic patients use hybrid rendering: code authors exact German documents/labels, LLM rewrites at most 300 patients; about 100 ingested/embedded, 20 fresh sample patients may be committed.                                                              |
| 30 Oct | Own verifier uses MLX-LM LoRA on a 4-bit Qwen3 base on the Mac; about 5k examples, one epoch, seq ≤512, ≤45 min training. GPT remains default unless held-out results are equal or better.                                                                        |
| 30 Oct | At least 150 synthetic challenges over 50 patients; real regression, real blind held-out, synthetic, retrieval and verifier scores never mix. Challenge data is test-only, never training.                                                                        |
| 30 Oct | Technical paper uses an arXiv preprint layout and tectonic; tables/figures come from eval outputs, published numbers human-checked; missing experiments marked unmeasured.                                                                                        |
| 30 Oct | Neon rejects `pg_search` ("deprecated and no longer allowed"), so BM25 runs in-process over the evidence window's segments; Gemini Embedding 2 free tier is paced at 80 inputs/min (`GEMINI_EMBED_REQUESTS_PER_MINUTE`)                                           |

## Subsequent approved decisions

| Date        | Decision and consequence                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 Oct 2026 | Retain shadcn preset `b1aIcEuKO` and the dashboard-01 foundation. Use the compact ElevenLabs neutral theme, Inter typography and semantic clinical colours. Teal was tried and reverted; neutral primary/navigation tokens are binding. Hugeicons replaces Lucide in the patient app; the current guide specifies stroke 2. Earlier reference measurements at 1.5/1.75 describe past snapshots.                                  |
| 30 Oct 2026 | Make the patient app chat-first: AI SDK v7 generative UI, AI Elements transcript and `/api/chat` replace the assistant-ui dock and `/api/agent`. Store validated message parts in patient-scoped Neon chat history. Engine extraction and lens structured calls continue using the thin client.                                                                                                                                  |
| 30 Oct 2026 | Ship the supplied `apps/www` landing-page design and assets as-is by user decision. Preserve its copy, layout, media and fonts while wiring app links and metadata. Third-party design/asset provenance and the ABC Marist font licence risk are acknowledged; permission to reuse/distribute is not established by this decision.                                                                                               |
| 30 Oct 2026 | Adopt Biome for JavaScript/TypeScript formatting, lint, filenames and imports; retain ruff for Python. Husky replaces `.githooks`: pre-commit runs the data guard first, staged Biome and ruff; commit-msg enforces Conventional Commits. Never bypass either hook.                                                                                                                                                              |
| 30 Oct 2026 | Use `apps/app`, workspace `@medlyn/app`, on port 3000 at `app.example.com`. `apps/www` is the root-domain landing page on port 3001. The integration sweep aligns filesystem, package, scripts and documentation. These domains are configuration examples.                                                                                                                                                                      |
| 30 Oct 2026 | Gemini quota failures must not disable an otherwise complete absence proof. Vector search is supplemental: missing configuration/coverage, HTTP 429 or a four-second deadline records `lexical_fallback`. Exhaustive bilingual synonym/lexical checking and a successful full-document LLM pass over every eligible document remain mandatory. Lexical/full-text failure stays `unavailable`; top-k results never prove absence. |
| 30 Oct 2026 | Confirm `pg_search` is unavailable on the configured Neon host despite being listed: extension installation is rejected. Use actual in-process BM25 over the store-provided evidence window, fused with pgvector results when available. Keep the ParadeDB migration for compatible hosts; do not describe this deployment as running ParadeDB.                                                                                  |
| 30 Oct 2026 | The hosted app is public without a demo password (user decision). Risk acknowledged: challenge document text served from Neon becomes readable by anyone with the URL; the challenge rule only forbids publishing the data folder in the repo. The app keeps noindex and X-Robots-Tag.                                                                                                                                           |

## Submission evidence policy

The final submission brief authorises agent review under the existing reviewer
wording, without implying clinician review. We publish frozen numeric aggregates,
remove unmeasured paper rows/panels and keep primary cold checks separate from repeat
and cached failures. The cascade remains research only; projected offline GPT savings
are not production savings. No engine behavior or frozen contract changes in this lane.
