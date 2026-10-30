# Medlyn agent guide

Medlyn is an IBM Austria Track 1 hackathon prototype: one clinician, one task,
source-linked patient facts. Read [PRD v3](docs/PRD.md) before changing behavior.
Part A/A+ have build time; Part B has none. A+ has a three-hour cap: integrate
T+1:30, freeze T+2:30, stop T+3:00. Regression/demo take priority; ask before
expanding scope. See [decisions](docs/decisions.md).

## Repository map

| Path                | Responsibility                                                             |
| ------------------- | -------------------------------------------------------------------------- |
| `apps/www`          | Public landing page; root domain; local port 3001                          |
| `apps/app`          | Patient app, chat, Situations and API routes; app subdomain; port 3000     |
| `packages/engine`   | Evidence storage, ingest, retrieval, lens, claims, agent, reviews, letters |
| `packages/tsconfig` | Shared strict TypeScript configurations                                    |
| `eval`              | Real/synthetic suites, retrieval reports and browser checks                |
| `ml`                | uv-managed synthetic generation, PDF tooling and MLX verifier research     |
| `paper`             | LaTeX preprint, generated aggregate tables and tectonic build              |
| `docs`              | Product specification, architecture, decisions, status and design guidance |

## Setup

Use Node.js 24+ and pnpm 10.18.0. Workspaces come from `pnpm-workspace.yaml`,
not a root `workspaces` field. Use **pnpm only**, never npm/Bun installs. To repair
a Bun store split, remove `bun.lock`, `node_modules/.bun` and `node_modules`,
then reinstall with pnpm.

```sh
pnpm install
cp .env.example .env
# Fill root .env: proxy credentials, model roles, Neon URL and local corpus path.
pnpm db:push
pnpm ingest
pnpm warm
pnpm dev
```

On a fresh database, follow [search setup](packages/engine/search/README.md) before
`db:push`. Engine scripts/the app load root `.env`; never create package `.env`
files. Export landing origins before building. See the [README](README.md).

## Commands

| Command                                                                       | Purpose                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                                                                    | Both apps through Turbo                                                   |
| `pnpm build`                                                                  | Workspace builds, dependency ordering and cached outputs                  |
| `pnpm typecheck` / `pnpm test` / `pnpm lint`                                  | Turbo tasks for packages defining each script                             |
| `pnpm check` / `pnpm format`                                                  | Repository Biome check / format; avoid global writes during parallel work |
| `pnpm exec biome check --write <owned-files>`                                 | Format, lint and organise imports within your lane                        |
| `pnpm smoke [model…]`                                                         | Proxy chat, schema, tools, streaming and latency checks                   |
| `pnpm db:push`                                                                | Push the Drizzle schema to the configured Neon database                   |
| `pnpm ingest [--data <path>]` / `pnpm warm`                                   | Ingest runtime documents / refresh five situation caches                  |
| `pnpm lens --chip <id> --no-cache`                                            | Inspect a cold engine lens                                                |
| `pnpm eval --suite real`                                                      | Real regression and blind worker; observe the held-out gate below         |
| `pnpm eval --suite synthetic` / `pnpm eval --suite all`                       | Synthetic / separate suite reports; never pool scores                     |
| `uv run python -m synth.generate` / `uv run python -m synth.materialise`      | Generate / materialise synthetic patients                                 |
| `uv run python -m synth.render_pdf` / `uv run python -m synth.rewrite`        | Render PDF/scan fixtures / bounded prose rewrites                         |
| `uv run python -m verifier.build_dataset` / `uv run python -m verifier.train` | Prepare inputs / train within the research cap                            |
| `uv run python -m verifier.evaluate` / `uv run python -m verifier.serve`      | Compare verifier methods / serve the research adapter                     |
| `uv run ruff check .` / `uv run ruff format .` / `uv run python -m pytest`    | Python checks, from `ml/`                                                 |
| `make -C paper` / `make -C paper test`                                        | Generate tables and PDF / test number extraction                          |

Run `uv` from `ml/`; use module `--help` for arguments. Keep Python out of pnpm.
Synthetic jobs use concurrency 3 and yield to regression; limits are per process.

## Code conventions

- Use kebab-case filenames, including components; PascalCase component identifiers.
- Biome owns TypeScript/JavaScript formatting, lint and imports: two spaces,
  double quotes, semicolons, 100 columns. Python uses ruff and pytest.
- Node runs TypeScript with `--experimental-strip-types`: erasable syntax only;
  no enum, namespace or parameter properties. Relative engine imports retain `.ts`.
- Prefer named exports, early returns, narrow types and focused functions. Keep
  components around 150 lines or less; put hooks in `hooks/`. Avoid empty catches,
  dead code, TODO/FIXME markers and comments that merely restate the code.
- In `apps/app`, use existing shadcn/ui primitives, preset `b1aIcEuKO`, and the
  dashboard-01 shell. Tailwind utilities go on primitives; no hand-rolled widgets
  or custom CSS classes. Do not hand-edit generated `components/ui/` files.
- Use Hugeicons (`@hugeicons/react` and `@hugeicons/core-free-icons`) at stroke 2.
  Theme through CSS variables and the neutral ElevenLabs tokens; no hard-coded
  colours. Preserve clinical warning, destructive and success meanings.
- The supplied `apps/www` design/assets are preserved by user decision; the app's
  shadcn-only design rule does not authorise redesigning the landing page.
- Use Context7 for library/framework/SDK/API/CLI/cloud documentation: resolve the
  library ID first, then query one concept at a time with the matching version.
  If unavailable, inspect installed types/docs and primary documentation; report
  the fallback. General logic refactors and code reviews need no library lookup.
- Stack contracts: Zod 4, Drizzle 0.44, Neon HTTP, AI SDK v7. Engine structured calls
  use `structured(role, name, schema, messages)`; LLM schema fields use `.nullable()`
  rather than `.optional()`. Never hard-code language-model IDs; use env roles.
- Husky enforces Conventional Commits and runs data checks, staged Biome and ruff.
  Keep imperative subjects at most 72 characters. Never use `--no-verify`.
- In shared-tree lanes, edit only owned paths; request cross-lane changes in your
  handoff. Do not install, stage, commit, stash, reset or revert others' work.
  The orchestrator integrates and commits.

## Testing and evaluation

Test logic, parsing, invariants and errors with Vitest under engine `tests/` or
the owning app; avoid mock-heavy tests. Corpus tests load runtime data and skip
when absent. Run package typechecking (`pnpm exec tsc --noEmit`), focused tests
(`pnpm exec vitest run <tests>`) and owned-file Biome. For UI, run the app
check. Report off-lane errors without fixing them.

The five challenge situations are the 15-answer regression set. Fix the engine
when it fails; change an expectation only if it was wrong and explain why. Use an
empty review layer. The 20 independently authored blind situations remain closed
until the orchestrator's H+7 review; do not inspect results or tune against them.
The current real/all CLI schedules the blind worker: do not run it before that
gate; request a regression-only runner instead. `all` never waives the gate.

Keep real regression, real blind held-out, synthetic pipeline, retrieval and
verifier results separate. Synthetic labels come from final rendered text and
mutation ledgers, never Medlyn's extractor. Split patients and generation families
before rewriting; hold out styles, scenarios and mutation types. Real-patient
validator decisions are test-only. Code-checked labels are not human gold. Only
human-checked figures go into `METRICS.md` and published paper claims.

## Engine invariants

1. **Located evidence.** Store a fact only when its quote is found in its segment
   and every number, date, dose and side in its fields occurs in that passage
   (`locationOk: true`). Drop and log failures. PDF/scan facts need extracted-text
   page/box provenance; image embeddings retrieve, never establish evidence.
2. **One claim boundary.** Every patient statement on cards, findings, headlines,
   chat, speech and letters passes `packages/engine/claims/`. Rejected composed
   claims fall back to checked template lines; no output channel bypasses it.
3. **Selection, then templates.** The model returns fact IDs, completeness and an
   optional headline. It never writes card lines or arbitrary missing-field prose.
4. **Proven absence.** "Not documented" requires synonym-expanded retrieval and
   exhaustive lexical checking plus a successful full-text LLM pass over every
   eligible document. Vector search supplements recall; quota/configuration errors
   may use the recorded lexical fallback. Lexical/full-text failures or timeouts
   mean `unavailable` ("Couldn't check"), never a gap. Top-k alone proves nothing.
5. **One evidence window.** Only `store.evidenceWindow` defines eligibility:
   `doc_date <= asOf`. Resolver, search, absence, findings, tools and letters share
   the same patient/revision/set; never implement local date filtering.
6. **Separate states.** Availability, assertion, temporal status, completeness,
   conflict and review are independent. Derive display without collapsing them.
7. **Review overlay.** Reviews are append-only ledger entries; documents, facts and
   validation results remain immutable. Evaluation always uses an empty overlay.
8. **Full cache identity.** Include patient, corpus revision, evidence window,
   validator version, normalised text, cited fact IDs with content hashes and
   segment IDs. Adding fields is fine; removing any is a bug.
9. **Adjudicated findings.** Only `contradiction` and `needs_clarification` reach
   users. Prove same-event identity; medication-list changes are trends. Keep the
   PRD dismissal fixtures off screen.
10. **Source-labelled medication.** Label lists with their source and date, such
    as "Discharge medication, 15 Apr 2016"; never "current medication".

The frozen screen contract is `packages/engine/contracts.ts`; do not edit it in a
lane. Schema follows the contract. An approved contract change updates both sides
in one commit and explains it in the body.

## Data rule — breaking it disqualifies the submission

- `data/`, `TRACK-1-clinical-documentation/`, zips, dumps and `.env` never reach git.
  Husky runs `scripts/check-data.mjs` first: blocked paths and any copied
  120-character challenge-document passage must be rejected. Without local data,
  the hook checks paths only; that does not authorise publishing source text.
- Never paste document text into code, tests, fixtures, prompts in source, commit
  messages or PR bodies. Use `documentId@start–end` references; load text at runtime
  from `path.resolve(repoRoot, process.env.MEDLYN_DATA_PATH)`. Short PRD quotes are
  the ceiling. Normalised-text offsets use UTF-16 code units.
- Never bypass the hook. If it blocks content, fix the content, not the hook.
- Keep bulk `ml/data/`, PDFs/scans, weights, adapters and evaluation evidence local
  and ignored. Only 20 fresh synthetic sample patients may be committed. Challenge
  text never enters templates, training, paper examples or committed outputs.

## Environment

Root `.env.example` is the configuration inventory; never print secrets.

| Variable                                      | Purpose                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `OPENAI_BASE_URL`, `OPENAI_API_KEY`           | OpenAI-compatible proxy endpoint and credentials                                                       |
| `MODEL_REASONING`, `MODEL_FAST`               | Ingest/judge and fast live/semantic model roles                                                        |
| `MODEL_STT`                                   | Leave empty; feature-detected browser recognition supplies text                                        |
| `DATABASE_URL`, `DATABASE_URL_DEMO`           | Active Neon database / optional frozen demo connection                                                 |
| `MEDLYN_DATA_PATH`                            | Local runtime corpus, resolved from repo root                                                          |
| `GEMINI_API_KEY`                              | Optional Gemini text/page retrieval embeddings                                                         |
| `GEMINI_EMBED_REQUESTS_PER_MINUTE`            | Per-process embedding input budget; default 80                                                         |
| `MEDLYN_LLM_CONCURRENCY`                      | Per-process thin-client proxy limit; default 8, synthetic jobs 3                                       |
| `MEDLYN_VERIFIER`                             | Research client flag `local`; leave unset for GPT; promotion requires integration and cache versioning |
| `FISH_AUDIO_API_KEY`, `FISH_AUDIO_VOICE_ID`   | Optional fish.audio TTS credentials and voice                                                          |
| `DEMO_PASSWORD`                               | Reserved demo setting; deployment must enforce actual access control                                   |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | Public origins; set before build, never put secrets here                                               |

## Further reading and handoff

[Architecture](docs/architecture.md) explains the runtime. Append PRD departures
to [decisions](docs/decisions.md). [Status](docs/status.md) owns checkpoints and
measurements. Read [tokens](docs/design/elevenlabs-tokens.md) for design and
[SEO](docs/seo.md) for indexing; [docs index](docs/README.md) links other guides.

Write `/private/tmp/medlyn-<lane>.md`: files, commands, fresh checks, gaps, Requests.
The orchestrator mirrors it to `.agents/reports/`. Supply an ordered
`/private/tmp/medlyn-<lane>-commits.json`, each changed/deleted path once.
