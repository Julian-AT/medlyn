# Medlyn

Hackathon build (Track 1, IBM Austria): one clinician, one task, one screen of
source-linked patient facts. The spec is `docs/PRD.md` (v3). Read the section
you are touching before you touch it. This file holds what the PRD doesn't:
the rules agents keep breaking, the decisions made since v2, and where the
build stands.

Part A and the approved A+ · Scale and research block get build time. Part B
is never built; the former Part C is folded into A+. A+ has a hard three-hour
limit from launch: integrate T+1:30, freeze T+2:30, done T+3:00. The real-patient
regression and demo keep priority. Outside Part A/A+, ask first.

## Data rule (challenge rule; breaking it disqualifies us)

- `data/`, `TRACK-1-clinical-documentation/`, zips, dumps and `.env` never
  reach git. `.githooks/pre-commit` runs `scripts/check-data.mjs`, which
  blocks those paths and any 120-character passage copied verbatim from the
  challenge documents.
- Never paste document text into code, tests, fixtures, prompts in source,
  commit messages or PR bodies. Point to passages as `documentId@start–end`
  and load the text from `MEDLYN_DATA_PATH` at runtime. Short quotes already
  in the PRD are the ceiling.
- Never bypass the hook (`--no-verify`). If it blocks something, the content
  is wrong, not the hook.

## Toolchain (overrides personal defaults)

- **pnpm only.** Never run `bun install` or `npm install` here. A stray Bun
  install on 30 Oct split `node_modules` between two stores, and
  `drizzle-kit` then couldn't see the Neon driver. If `bun.lock` or
  `node_modules/.bun` appears, delete both plus `node_modules`, then run
  `pnpm install`.
- Turborepo, with workspaces from `pnpm-workspace.yaml`. No `"workspaces"`
  field in `package.json`.
- Node runs TypeScript directly (`--experimental-strip-types`): erasable
  syntax only (no `enum`, `namespace` or parameter properties), and relative
  imports keep their `.ts` extension.
- Python work uses **uv in `ml/`**, ruff for lint/format and pytest for tests.
  Do not mix Python installs into the pnpm workspaces.
- All visible UI uses existing **shadcn/ui** primitives, preset `b1aIcEuKO`
  and `dashboard-01`. Tailwind utilities on those components only; theme via
  CSS variables, icons via lucide-react. No custom CSS classes or hand-rolled
  widgets. Do not edit generated `components/ui/` by hand.
- Zod 4, Drizzle 0.44, Neon serverless driver, AI SDK v7. Fetch
  current docs via Context7 before writing code against any of them; the Zod
  4 and AI SDK v7 APIs differ from what most training data shows.

## Commands

| Command                              | What it does                                                               |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `pnpm install`                       | Install; also points `core.hooksPath` at `.githooks`                       |
| `pnpm smoke [model…]`                | Proxy check per model: chat, JSON schema, tool call, streaming, latency    |
| `pnpm db:push`                       | Push `packages/engine/db/schema.ts` to Neon (loads the root `.env`)        |
| `pnpm typecheck` / `pnpm test`       | Turbo across packages; Vitest                                              |
| `pnpm ingest` / `pnpm warm` | Ingest a runtime corpus / warm the configured situations |
| `pnpm dev` | Start the web cockpit |
| `pnpm eval --suite real`, `synthetic`, `all` | A+ suite selector; separate real/synthetic reports; preserve the real blind gate |
| `uv run python -m synth.generate` / `synth.materialise` | From `ml/`: generate 100k histories/documents, materialise patient JSON |
| `uv run python -m synth.render_pdf` / `synth.rewrite` | From `ml/`, planned: PDF/scan fixtures; at most 300 prose rewrites |
| `uv run python -m verifier.train` / `verifier.evaluate` | From `ml/`: verifier train/eval; build inputs with `verifier.build_dataset` first |
| `make -C paper` | A+ paper build with tectonic and generated evaluation tables |

Environment variables are documented in `.env.example`. Scripts read the root
`.env`; per-package `.env` files don't exist. `GEMINI_API_KEY` enables Gemini
Embedding 2. `MEDLYN_VERIFIER=local` selects the optional local semantic backend;
unset keeps GPT. `MEDLYN_LLM_CONCURRENCY` caps requests per process (default 8);
synthetic jobs set it to 3 and yield to regression runs. This is not a global
cross-process rate limiter.

The A+ commands above are the approved command contract, planned until their
lane reports verify them. Run Python commands from `ml/` with uv. Each module
needs the full `uv run python -m` prefix; use `--help` for its arguments. No root
Python wrappers are assumed. The PDF/rewrite entry points remain planned until
the synth lane delivers them.

## Invariants (the code is wrong if it breaks one)

1. **No fact without a located quote.** A fact exists only if its quote was
   found in its segment and every number, date, dose and side in its fields
   occurs in that passage (`locationOk: true`). Location failures are
   dropped and logged, never stored. For PDFs/scans, locate against extracted
   text with page/bounding-box provenance; image embeddings are retrieval
   only and never evidence.
2. **One claim boundary.** Every statement that reaches a user (card line,
   headline, spoken sentence, agent answer, letter sentence) is a `Claim` and
   passes `packages/engine/claims/` first. No side routes to the screen or the
   speaker. A composed claim that fails falls back to template lines.
3. **The model selects, templates render.** On screen, the LLM returns fact
   ids, completeness and an optional headline. It never writes card text.
4. **"Not documented" needs the full absence check.** Synonym-expanded
   hybrid BM25/vector search plus the full-text LLM pass over every eligible
   document. A failure or timeout is `unavailable` ("Couldn't check"), never a gap.
5. **One evidence window.** Eligible means `doc_date <= asOf`. Every component
   (resolver, absence check, findings, agent tools, letter) gets the same
   eligible set. Don't filter by date locally anywhere else.
6. **Card state dimensions stay separate.** Availability, assertion, temporal
   status, completeness, conflict and review are stored independently; the
   display is derived from them. Never fold one into another.
7. **Reviews are an overlay.** Append-only ledger entries; documents, facts
   and validation results are never edited. Evaluation always runs with an
   empty review layer.
8. **Cache identity is the full tuple** from PRD Definitions 2: patient,
   corpus revision, evidence window, validator version, normalised text,
   cited fact ids with content hashes, segment ids. Adding a field is fine;
   dropping one is a bug.
9. **Contradictions are adjudicated, not detected.** Only `contradiction` and
   `needs_clarification` reach the screen. Medication changes between lists
   are trends, never contradictions. The dismissal fixtures in the PRD must
   stay off screen.
10. **Medication lists carry their source** ("Discharge medication, 15 Apr
    2016"), never "current medication".

## Contracts

`packages/engine/contracts.ts` is the screen contract between the engine and
the UI lane, frozen at H+0.5. Changing it means changing both sides in the
same commit and saying so in the commit body. `db/schema.ts` follows the
contract, not the other way round.

## Models and latency

- The proxy is OpenAI-compatible at `OPENAI_BASE_URL`. Roles come from env
  (`MODEL_REASONING` for ingest, extraction and the eval judge; `MODEL_FAST`
  for parse, select, the absence check and the semantic check). Never
  hard-code a model id.
- Smoke test, 30 Oct: all six GPT candidates pass every check. The per-call
  floor is about 1.25 s, and JSON-schema output on the larger models
  reaches 4.4 s. Re-run `pnpm smoke` after changing a role.
- Consequence: two serial calls (parse, then select) can't meet "first card
  < 1.5 s". Situation chips map directly to their profile and skip parse; a
  typed situation streams section titles first. "Complete < 5 s cold" is the
  budget that matters.
- No speech-to-text model on the proxy, so `MODEL_STT` stays empty.

## Decisions since PRD v2

| Date   | Decision                                                                                                                                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 Oct | pnpm only (see Toolchain)                                                                                                                                                                                                                                        |
| 30 Oct | Push-to-talk uses the browser's speech recognition, and only if it integrates cleanly: feature-detected, the orb hidden when unsupported, no polyfill or extra dependency. The transcript goes through the same path as typed text. Otherwise voice input is cut. |
| 30 Oct | Chips skip the parse call (see Models and latency)                                                                                                                                                                                                               |
| 30 Oct | `eval/` is a workspace package (`@medlyn/eval`); engine exports `"./*": "./*.ts"` so the web app imports engine modules by path                                                                       |
| 30 Oct | Engine LLM calls use a thin fetch client (`llm/client.ts`, JSON-schema + Zod, one retry); AI SDK v7 is used only for the Ask Medlyn agent route and dock                                                     |
| 30 Oct | PRD v3 approves A+ in parallel with Part A; former Part C moves into A+. Hard limit three hours, integrate T+1:30, freeze T+2:30; real regression/demo retain priority. |
| 30 Oct | All visible UI is shadcn-only; preset `b1aIcEuKO`, `dashboard-01` shell; assistant-ui supplies dock runtime/structure. |
| 30 Oct | Hybrid search stays in Neon: pgvector + ParadeDB `pg_search` BM25, reciprocal rank fusion; absence stage (a) and agent search share the store evidence window. Full-text absence pass stays. |
| 30 Oct | Multimodal ingest extracts PDF/scan text with page boxes and runs normal quote location; Gemini Embedding 2 text/page vectors support retrieval only. |
| 30 Oct | 100k synthetic patients use hybrid rendering: code authors exact German documents/labels, LLM rewrites at most 300 patients; about 100 ingested/embedded, 20 fresh sample patients may be committed. |
| 30 Oct | Own verifier uses MLX-LM LoRA on a 4-bit Qwen3 base on the Mac; about 5k examples, one epoch, seq ≤512, ≤45 min training. GPT remains default unless held-out results are equal or better. |
| 30 Oct | At least 150 synthetic challenges over 50 patients; real regression, real blind held-out, synthetic, retrieval and verifier scores never mix. Challenge data is test-only, never training. |
| 30 Oct | Technical paper uses an arXiv preprint layout and tectonic; tables/figures come from eval outputs, published numbers human-checked; missing experiments marked unmeasured. |

Add a row whenever the build departs from the PRD.

## Evaluation discipline

- The 5 challenge situations are the regression set; target 15/15.
- The 20 held-out situations are written by someone who isn't tuning prompts.
  Agents don't open their results or tune against them before H+7.
- When an eval fails, fix the engine, not the expected answer. Change an
  expectation only when it was wrong, and say so explicitly.
- `METRICS.md` and the paper report human-checked numbers, not raw judge output.
- A+ synthetic labels come from verified final rendered text and mutation
  ledgers, never from Medlyn's own extractor. Split by patient and generation
  family before rewriting; hold out styles, scenarios and mutation types.
- Never pool real regression, real blind held-out, synthetic pipeline,
  retrieval or verifier scores. Real-patient validator decisions are a separate
  test set only, never training data. `--suite all` does not waive the H+7 blind gate.
- Bulk `ml/data/`, PDFs/scans, weights and adapters stay local/gitignored;
  only 20 fresh synthetic sample patients may be committed. No challenge text
  enters templates, training data, paper examples or committed output.

## Status

Started 03:37, 30 Oct 2026. Checkpoints: H+2 go/no-go, H+5 integration,
H+7 end to end, H+9 freeze (fixes only; unmerged work is dropped).

- [x] Workspace scaffold, data hook, contracts, Drizzle schema
- [x] Proxy smoke test (all checks pass), model roles set
- [x] Schema pushed to Neon
- [x] Mock `LensEvent` stream for situation 1, UI lane unblocked (H+0.5):
      `@medlyn/engine/lens/mock` (`mockLensEvents`, `mockLensStream(speed)`)
- [x] Thin slice: situation 1 through the real pipeline (H+2)
- [x] Ingest: 425 located facts, 97.5% IBM concept coverage, C1–C5 and D1–D3 stored
- [x] Lens pipeline, claim validator, review ledger, GP letter, Ask Medlyn, shadcn cockpit, eval harness
- [ ] 15/15 regression (first live eval 9/15; latest lens-pipeline report 14/15, 3.3 source-date mismatch still open; not yet a human-checked final score)
- [ ] Browser visibility and timing check, METRICS.md, video

Update this list when a checkpoint item lands.

A+ targets (approved scope; unchecked until the owning lane verifies):

- [ ] shadcn preset `b1aIcEuKO` applied; dashboard-01 build and screenshot verified
- [ ] 100k synthetic patients counted and sized; ≤300 rewrites; fresh 20-patient sample
- [ ] Hybrid BM25/vector retrieval in Neon; about 100 patients ingested/embedded
- [ ] Multimodal PDF/scan ingest: ≥95% fact overlap, all retained facts located
- [ ] Verifier dataset and human-reviewed gold subset; Mac training/evaluation within cap
- [ ] ≥150 synthetic challenges over 50 patients; separate retrieval/verifier reports
- [ ] Paper builds; tables generated from outputs and published numbers human-checked
- [x] PRD v3, agent rules, env example and README A+ scope documented
