# Build status

Snapshot: 30 October 2026. This page consolidates lane reports and inspected
artefacts; it does not certify a deployment or replace human-reviewed metrics.
The [agent guide](../AGENTS.md) contains rules and [decisions](decisions.md) records
approved changes. App paths below use the final `apps/app` / `@medlyn/app` names;
the integration sweep owns the rename from `apps/web` / `@medlyn/web`.

## Clock and checkpoints

Started **03:37, 30 Oct 2026** (Europe/Vienna).

| Checkpoint               | Local time | Evidence / remaining acceptance                                                                                                 |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| H+0.5: contract and mock | 04:07      | Frozen contracts and mock LensEvent stream delivered                                                                            |
| H+2: thin-slice go/no-go | 05:37      | Situation 1 completed through the real pipeline                                                                                 |
| H+5: integration         | 08:37      | Core ingest, lens, claims, findings, reviews, letter and UI delivered; subsequent chat/UI changes need final integration review |
| H+7: live end to end     | 10:37      | Automated regression reaches 15/15; final visible-screen/human review remains open                                              |
| H+9: freeze              | 12:37      | Fixes only; drop unmerged work. This entry records the deadline, not confirmation it was met                                    |

A+ has a separate hard three-hour window from its launch: integrate T+1:30,
freeze T+2:30, done T+3:00. Launch time and compliance require the orchestrator's
record. Part A regression and the demo keep priority.

## Part A

- [x] pnpm/Turbo workspace, frozen screen contracts and Drizzle schema delivered.
- [x] Proxy smoke checks: all six candidates passed chat, schema, tools and streaming.
- [x] Neon schema pushed; original corpus independently read back.
- [x] Ingest: **8 documents, 359 translated segments, 425 supported located facts**;
  **193/198 concept hints = 97.47%** coverage; zero invalid quote offsets reported.
- [x] Finding fixtures: **C1–C5** contradictions and **D1–D3** clarifications;
  live findings lane reported zero false alarms on that run.
- [x] Lens, shared claim validation, review ledger and GP letter implemented.
- [x] Chat-first app, persisted history, nine generative UI tools, patient pages and
  Situations delivered; this replaces the earlier assistant-ui dock.
- [x] Latest absence-fallback automated regression: **15/15 answers/citations and
  15/15 full assertions**, expectations unchanged; **5/5 lenses warmed**.
- [ ] Human-check all 15 answers on the final integrated visible screens.
- [ ] Meet cold <5 s and cached <1 s consistently; browser timing remains open.
- [ ] Final browser visibility/interaction pass, submission screenshot, video ≤2 min
  and human-checked `METRICS.md`.

The earlier regression report also reached 15/15. Multi-patient work temporarily
fell to 12/15 answers and 3/15 full checks under Gemini failures; the later
absence-fallback report restored 15/15 without weakening the full-document check.
This is automated engine evidence, not a browser-visible or human clinical score.

## Measurements — keep denominators separate

**Agent-reviewed (Codex), not clinician-reviewed — 30 October 2026.** Live API
screen review completed for all 15 expected answers and C1–C5/D1–D3. Original
free-text and chip cold matrices each passed **15/15**; 10/10 random fact-line
quote checks passed; no unsupported line found among 167 distinct supported card
lines reviewed; five true contradictions, zero false findings, three separate
clarifications, all 29 finding passages checked. These are screen-data checks;
browser visibility and clinician sign-off remain open. See
[METRICS.md](../METRICS.md) and the [completed sheet](submission/human-check.md).

Slowest lens-cache-bypass API stream: **10.138 s**; slowest confirmed cached API
stream: **0.239 s**. An additional uncached fill took **12.943 s**. One emergency
fill returned 12 unavailable cards, then recovered on retry. Cached text lost a
carotid card warning; cached chip HER2/Ki-67 sources differed from the expected
document. Both confirmed cached matrices score **14/15 under strict warning/source
checks**, so this is not an all-runs 15/15 result. The cold <10 s/<5 s gates failed.

The existing regression artefact inspected at 09:39:25Z records **12/15 answer
passes and 3/15 full suite passes**; existing Playwright output records **five
failures and zero passes**. The later 15/15 lane report below is a separate run,
not the current on-disk artefact. Blind results were not inspected. Research
figures below retain their original denominators and are not clinician-reviewed.

### Earlier automated and research snapshots

| Experiment                     | Measured result                                                  | Scope and limitation                                                                                 |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Real regression                | **15/15 reported automated; on-disk 12/15**                      | Latest absence-fallback run; no blind results opened for this docs update                            |
| Cold lens latency              | Final fallback regression **5.6–9.9 s**                          | Still above 5 s; warm-generation times **4.72–7.27 s** are not cached-request timings                |
| Earlier cached lens sweep      | **0.79–1.10 s**, 3/5 below 1 s                                   | Separate regression snapshot; do not combine with later cold timings                                 |
| Retrieval recall@10            | **Hybrid 0.633; vector 0.633; BM25 0.433**                       | Three queries on one ingested synthetic patient; tiny pilot, not a 50-patient result                 |
| Verifier macro-F1              | **Local 0.754; GPT 0.898; rules 0.287**                          | Same 90-example synthetic held-out-family set, full coverage; code-checked labels, not human gold    |
| Verifier mean latency          | **Local 576.6 ms; GPT 2026.7 ms; rules 0.1 ms**                  | Same result table; cached GPT predictions retain original request times; monetary tariff unavailable |
| Synthetic generation           | **100,000 patients**, **900,210 documents**, **4,824,477 facts** | Generated locally; this is not the number ingested into Neon                                         |
| Multimodal strict overlap      | **89.3% synthetic; 51.0% challenge**                             | Distinct kind/label/value recall versus JSON; below the **95%** target; not pure OCR accuracy        |
| Multimodal retained provenance | All stored quotes/offsets/page mappings passed read-back         | 19 page assets across the reported demo corpora; does not establish extraction recall                |

Retrieval numbers come from the eval-scale pilot; the later multi-patient synthetic
run recorded retrieval errors under Gemini quota exhaustion. Preserve both run
identities. Verifier values come from the newer `ml/verifier/RESULTS.md` and
`results.json`: they supersede the older verifier handoff's Metal blocker. The
local method remains below GPT and is not promoted to the production claim gate.
Real-patient weak-label verifier results are a separate test, never training data.

## A+ delivery

- [x] PRD v3 and the approved scope/cuts documented.
- [x] Preset/dashboard foundation and Hugeicons delivered; brand lane reported
  successful builds and light/dark/mobile shell checks.
- [x] **100k corpus** counted: **3,627,147,745 JSONL bytes**, 100 shards;
  train/validation/test split **80,000/10,000/10,000**.
- [x] Fresh **20-patient sample**: 190 documents, 969 facts; independent challenge
  passage scan reported zero overlaps. Labels remain `intended_code_checked`.
- [x] Synthetic PDF/scan rendering and bounded rewrite tooling delivered.
- [x] Window-scoped BM25/vector fusion, embedding backfill and search tests delivered;
  **359 challenge segment embeddings** reported. Neon rejects `pg_search`, so BM25
  runs in process; vector retrieval is quota-dependent.
- [x] Patient threading and isolation tested through live synthetic lens requests.
- [x] Multimodal CLI and page/box mapping implemented and checked; 95% overlap gate missed.
- [x] Verifier tooling and balanced dataset: **5,001 train / 600 validation / 900 test**;
  newer results report a trained adapter and held-out comparison.
- [x] **150 challenges / 50 patients / 450 questions generated**.
- [x] Paper built and visually inspected: reported **8 pages**, 11 number-extraction
  tests passed; aggregates generated with provenance hashes.
- [ ] About 100 successfully ingested/embedded synthetic patients verified; attempts
  and generated records do not count as successful imports.
- [ ] Execute at least 150 synthetic challenges across 50 ingested patients.
- [ ] Reach ≥95% strict PDF/JSON overlap with unchanged expectations.
- [ ] Human-reviewed gold subset and label-noise assessment.
- [ ] Verify training wall time/configuration against the ≤45 min, one-epoch,
  ≤512-token cap; retain model/adapter provenance and licence notices.
- [ ] Human-check published paper numbers and regenerate from the final coherent run.

The later multi-patient pilot measured **27 screens across 9 ingested patients**,
with 123 screens skipped for missing ingestion: correctness **27/81**, located
citations **286/286**, availability **0/27 screens**, unsupported displayed claims
**0**. No positive contradiction labels were present, so its zero false alarms
establish no contradiction sensitivity. Earlier eval-scale screens failed patient
isolation; do not present those captures as successful clinical runs. The larger
synthetic acceptance gate remains open.

## Integration and submission work

1. Complete the `apps/web` → `apps/app` rename in paths, package name, root dev
   filters, imports, lockfile and tests; verify both apps with final names.
2. Bump lens engine cache identity for the absence-fallback change and warm again.
   The handoff warmed existing `lens-pipeline-16` keys; cache changes are outside
   this docs lane. Preserve the full claim identity and revision guards.
3. Reconcile PRD wording with [approved changes](decisions.md): chat/AI Elements,
   neutral theme, Hugeicons, lexical fallback, Neon BM25 and final app names.
4. Check current hydrated chat, source sheets, gap retry, review/letter navigation,
   history deletion, active-patient switching, dictation and printing in the final app. Earlier cockpit and
   brand browser checks do not verify the later integrated chat UI.
5. Finish authenticated page-asset delivery and durable storage; multimodal handoff
   uses local temporary file URIs. Align its ingest stages with the full JSON
   coverage-repair orchestration before claiming overlap acceptance.
6. Preserve atomic publication intent: corpus and findings are written separately
   in the inspected ingest runner. Resolve the partial-publication audit before
   claiming that a revision can never appear without its findings.
7. Leave the local verifier unpromoted. The claim validator does not call the
   research HTTP client; enabling it would need an approved policy, held-out
   promotion evidence and validator identity including model/adapter hashes.
8. Reconcile rewrite accounting: synth reports 300 main-corpus patients plus four
   sample rewrites separately against the approved ≤300-patient cap.
9. Finalise deployment origins, real external link destinations, public SEO/browser
   checks and actual demo access control. `DEMO_PASSWORD` alone is not enforcement;
   noindex headers and robots rules are not authentication.
10. Confirm third-party landing design/assets and ABC Marist permissions before
    distribution/deployment. The user-approved design is retained; rights remain
    unverified. Check hook activation (`.husky/_`) before orchestrator commits.

## Evidence sources

Lane reports are internal, ignored integration evidence under `.agents/reports/`:
`regression.md`, `absence-fallback.md`, `multi-patient.md`, `ingest-llm.md`,
`findings.md`, `fix-committed.md`, `search.md`, `eval-scale.md`, `synth.md`,
`multimodal.md`, `chat.md`, `gen-ui.md`, `brand.md`, `paper.md` and `tooling.md`.
Newer [verifier results](../ml/verifier/RESULTS.md) supersede its older handoff.
[Paper provenance](../paper/README.md) explains how aggregates are selected.

The complete paper input bundle can still reflect an older 9/15 run while the
standalone regression reports 15/15. Regenerate coherently; never replace one
number inside an otherwise older report. Keep private evaluation text, logs,
blind results, source passages and generated patient artefacts out of git.
