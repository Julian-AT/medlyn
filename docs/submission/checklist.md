# Submission checklist

For the orchestrator and final reviewer. Use this to assemble and sign off the
Track 1 submission. Snapshot: 30 October 2026; based on repository files and lane
reports, not a fresh deployment or clinical review.

**Done** means the named artefact exists or the reported check has evidence.
**Pending** means final acceptance or delivery is outstanding. Owners are lane or
role names, not assigned people. A done implementation row does not certify the
pending browser, human, publishing or deployment rows.

Start with the [video script](../video-script.md) and [human-check sheet](human-check.md).
The binding local challenge brief is `TRACK-1-clinical-documentation/README.md`;
it and its data stay outside the public repository. Product requirements are in
[PRD v3](../PRD.md), with approved changes in [decisions](../decisions.md).

## Required challenge deliverables

| Requirement                                                                | Status  | Owner                       | Evidence path / remaining acceptance                                                                                                                                                      |
| -------------------------------------------------------------------------- | ------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo video at most two minutes, saying what works and what does not        | Pending | Recorder / orchestrator     | `docs/video-script.md` prepared; exported video, duration and submission link still needed.                                                                                               |
| Public repository link, accessible to the jury                             | Pending | Orchestrator                | Final repository URL and logged-out access check needed. Local files do not prove public availability.                                                                                    |
| No challenge data in the public repository; synthetic data only            | Pending | Orchestrator                | `AGENTS.md`, `.gitignore`, `scripts/check-data.mjs`; final tracked-file/history and staged-content checks required. Never publish the challenge folder, source passages, dumps or `.env`. |
| Instructions to run the application                                        | Done    | Docs                        | `README.md` Quickstart covers prerequisites, root environment, database/search setup, ingest, warm and dev. Fresh external reproduction remains below.                                    |
| README technical architecture: built components and how they work together | Done    | Docs                        | `README.md` architecture diagram and How it works; `docs/architecture.md`.                                                                                                                |
| README models and services used                                            | Done    | Docs                        | `README.md` Models and services, including proxy model roles, Neon, Gemini, browser recognition and optional fish.audio. No integrated vLLM service is claimed.                           |
| Submit metric results on all five challenge situations                     | Pending | Evaluation / human reviewer | Automated 15/15 reported in `.agents/reports/absence-fallback.md` and `.agents/reports/data-quality.md`; final human sheet and root `METRICS.md` needed.                                  |

## Five challenge metrics

Use an empty review layer, the same final app/corpus version and all five original
situations. Scroll is allowed; opening an answer, expanding a card or asking chat
to reveal it does not satisfy “visible without clicking”. Source opening is checked
after visibility scoring. Do not pool per-question or per-screen counts.

| Metric and challenge target                                                                    | Status  | Owner                       | Evidence path / remaining acceptance                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correct answers: 15/15 visible with a link to an expected source; absence needs no source link | Pending | Human reviewer              | `docs/submission/human-check.md`, rows 1.1–5.3. Engine 15/15 is automated evidence only.                                                                                                    |
| Traceability: 100% of displayed facts link to the right sentence/table row                     | Pending | Human reviewer / QA         | Audit every fact across the five screens, including extras beyond the 15 answers; record numerator/denominator in `METRICS.md`. Located-offset reports alone do not verify the UI links.    |
| Invented facts: zero unsupported facts on the five screens                                     | Pending | Human reviewer / evaluation | Full visible-card and composed-claim audit; empty overlay. `packages/engine/claims/` implementation and automated checks are supporting evidence.                                           |
| Contradictions: at least five unique true cases minus false alarms; each links every passage   | Pending | Findings / human reviewer   | C1–C5 and D1–D3 sheet; `.agents/reports/findings.md` reports 5 contradictions, 3 clarifications, zero false alarms. Count C1 once across repeated cards. Clarifications do not count.       |
| Load time: slowest of five, submission to complete screen, under 10 seconds                    | Pending | QA / evaluation             | Browser timings for each cold and warm run needed. `.agents/reports/absence-fallback.md` reports cold engine 5.6–9.9 s; this is not final browser timing. Earlier regression exceeded 10 s. |

## PRD submission items and recording conditions

| PRD item                                                                                          | Status  | Owner                       | Evidence path / remaining acceptance                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------- | ------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Video ≤2:00 including limitations                                                                 | Pending | Recorder                    | `docs/video-script.md`; preserve final 15 seconds and verify final export.                                                                                                                                  |
| Record frozen Neon demo branch, empty review layer, warm cache and one cold run                   | Pending | Orchestrator / recorder     | `docs/video-script.md` recording checklist; final branch/version, 5/5 warm log and `cached: false` take needed.                                                                                             |
| Public repo excludes `data/`, proved by active pre-commit data check                              | Pending | Orchestrator                | `scripts/check-data.mjs`, `.husky/pre-commit`; hook activation, final staged scan and repository/history inspection needed. A no-data path-only scan is insufficient.                                       |
| README architecture diagram, components, interactions, models/services and dependency licences    | Done    | Docs                        | `README.md`, `docs/architecture.md`; licence inventory includes unresolved distribution rights, not a clearance claim.                                                                                      |
| Run instructions include pnpm install, `.env.example`, db push, ingest with external path and dev | Done    | Docs                        | `README.md` Quickstart includes search prerequisites and `pnpm ingest --data <path>` override. No package `.env` files.                                                                                     |
| Human-checked root `METRICS.md` for five situations, clean overlay, held-out by tier              | Pending | Evaluation / human reviewer | `docs/submission/human-check.md`; publish aggregates only. No human sign-off or final `METRICS.md` established by this lane.                                                                                |
| Password-protected hosted demo, optional                                                          | Pending | Deployment / orchestrator   | `docs/deploy.md`, `.agents/reports/deploy-prep.last.md`; password/session implementation reported, but live URL and actual access-control check still needed. Optional hosting is not a submission blocker. |

## Evidence to close the PRD acceptance gates

| Gate                                                                                                   | Status  | Owner                     | Evidence path / remaining acceptance                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typed role/task, five chips and a role without a profile                                               | Pending | Chat / QA                 | Implemented in `apps/web`; verify anaesthetist chat, five Situations chips and dentist tier 3 on final app. `docs/decisions.md` defines approved chat-first replacement.                    |
| Located evidence, ≥95% concept coverage and checked extraction                                         | Done    | Ingest                    | `.agents/reports/ingest-llm.md`: 8 docs, 425 supported facts, 193/198 concept hints, 97.47%; reported run, not final UI audit.                                                              |
| All 15 answers visible without expanding generated UI                                                  | Pending | QA / human reviewer       | Human sheet plus `eval/playwright/visibility.spec.ts`; QA snapshot in `docs/qa/checklist.md` predates subsequent fixes.                                                                     |
| Exact passage popup, original German/English and comparator                                            | Pending | Sources / QA              | `.agents/reports/sources-popup.md`, `.agents/reports/home-chat.md`; final desktop/mobile, translation and focus checks required.                                                            |
| Three availability states; “not documented” only after complete checks; failures show “Couldn't check” | Pending | Lens / QA                 | `.agents/reports/absence-fallback.md`, engine absence tests; verify 8/8 kidney-function and follow-up gaps plus retry/error behavior in final UI.                                           |
| Shared claim boundary across cards, chat, speech and letters                                           | Done    | Engine                    | `packages/engine/claims/`, `.agents/reports/lens-core.md`, `.agents/reports/agent.md`, `.agents/reports/review-letter-fix.md`; preserve gate during integration.                            |
| C1–C5, D1–D3 separate, dismissal fixtures absent                                                       | Pending | Findings / human reviewer | `docs/submission/human-check.md`; no medication trend or small measurement variation counted as contradiction.                                                                              |
| PRD speed targets: first card <1.5 s, complete <5 s cold and <1 s cached                               | Pending | Performance / QA          | `docs/status.md`, `.agents/reports/regression.md`; not consistently met. Record all five browser runs; do not substitute warm-generation times.                                             |
| Regression evaluator and browser visibility/timing harness                                             | Done    | Evaluation                | `eval/README.md`, `eval/run.ts`, `eval/playwright/visibility.spec.ts`; final execution/sign-off is pending.                                                                                 |
| Independent blind held-out relevance/grounding by tier                                                 | Pending | Orchestrator / evaluation | Keep `eval/heldout/` and results closed until explicit orchestrator H+7 review. Do not run real/all merely to refresh regression; request regression-only execution.                        |
| Open questions → Investigate → Leave open → cited GP letter                                            | Pending | Workflow / QA             | `.agents/reports/pages-v2.md`, `.agents/reports/review-letter-fix.md`; direct-entry and popup checks reported, final integrated rehearsal needed.                                           |
| Review accept/correct/dismiss/leave-open/reset; no source mutation                                     | Pending | Reviews / QA              | `.agents/reports/review-letter.md`, `.agents/reports/pages-v2.md`; verify final reset and re-review flags.                                                                                  |
| GP letter under 15 s; factual claims cited; C1 clarification; unsupported edit separated               | Pending | Letter / human reviewer   | `.agents/reports/review-letter-fix.md` reports 26 supported/cited claims at 3.83 s; final letter precision/recall and UI edit/print review needed.                                          |
| Research Evaluation shows a coherent final run and status labels                                       | Pending | Pages / evaluation        | `apps/web/app/api/research/evaluation/route.ts` reads `eval/output/regression.json`; reconcile possible older 9/15 bundle before filming. Keep all suites separate.                         |
| Quantum card mounted and labelled offline, research-only, human check pending                          | Pending | Pages / quantum           | `apps/web/components/research/quantum-card.tsx` exists; inspected `evaluation-page.tsx` does not mount it. `.agents/reports/quantum.md`: Gemini/hardware pending, no advantage established. |
| Clean checkout can follow README; final apps and workspace names agree                                 | Pending | Integration / deployment  | `README.md`, `docs/status.md`; documented final `apps/app` name still differs from inspected `apps/web` tree. Fresh external run needed after integration.                                  |
| Public repo and submission links resolve; source text/logs/recordings excluded                         | Pending | Orchestrator              | Final URL/access review, export inventory and data scan. Keep private screenshots and footage outside git.                                                                                  |

## A+ research evidence, separate from the five-situation score

These are PRD v3 delivery gates, not additional challenge scoring metrics. They
must not displace the Part A review or imply that unmeasured experiments passed.

| Gate                                                                                                   | Status  | Owner                  | Evidence path / remaining acceptance                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 100k generated histories with count/size/seed/splits; fresh 20-patient sample only in git              | Done    | Synth                  | `.agents/reports/synth.md`, `docs/status.md`: generated locally; generation is not ingestion.                                                                         |
| ≤300 patient rewrites, process concurrency 3, no challenge prose in templates/training                 | Pending | Synth / orchestrator   | `docs/status.md` requests reconciliation of 300 corpus plus 4 sample rewrites; final manifests and source-overlap scans required.                                     |
| About 100 successfully ingested/embedded patients; execute ≥150 challenges over 50                     | Pending | Search / evaluation    | `.agents/reports/multi-patient.md`, `docs/status.md`; 27 screens on 9 patients is a pilot, 150 generated challenges is not 150 executions.                            |
| Multimodal ≥95% strict fact overlap, retained facts located with page/box provenance                   | Pending | Multimodal             | `.agents/reports/multimodal.md`: 89.3% synthetic and 51.0% challenge overlap; provenance passed reported read-back. Authenticated durable page delivery remains open. |
| Retrieval A/B: BM25, vector, hybrid recall@k, latency and index size                                   | Pending | Search / evaluation    | `.agents/reports/eval-scale.md`: three-query pilot, not full acceptance; Gemini quota limits remain explicit.                                                         |
| Verifier split isolation, human gold subset, dataset card, provenance/licences and training-cap record | Pending | ML / human reviewer    | `ml/verifier/RESULTS.md`, `.agents/reports/hf-publish.md`; code-checked labels are not human gold, checkpoint attribution and human review remain open.               |
| Verifier quality/coverage/latency/cost versus GPT and rules; no unearned promotion                     | Pending | ML / evaluation        | `ml/verifier/results.json`, `docs/status.md`; local research is below GPT, monetary tariff unavailable. Leave production claim gate on GPT.                           |
| Technical paper builds, numbers generated from coherent outputs and human-checked                      | Pending | Paper / human reviewer | `paper/README.md`, `.agents/reports/paper-v2.md`, `.agents/reports/paper-figures.md`; latest report describes 12-page paper; measurement review still pending.        |
| A+ integrated T+1:30, frozen T+2:30 and stopped T+3:00; Part B no build time                           | Pending | Orchestrator           | `docs/PRD.md`, `docs/status.md`; launch/checkpoint compliance needs the orchestrator record.                                                                          |

## Final handover record

Complete outside git if it includes screenshots or private evaluation evidence.

| Field                                                   | Value |
| ------------------------------------------------------- | ----- |
| Reviewer / date                                         |       |
| Final app commit and corpus revision                    |       |
| Empty review session verified                           |       |
| Human-check sheet location and sign-off                 |       |
| Human-checked `METRICS.md` commit                       |       |
| Five cold/warm browser timing evidence                  |       |
| Final exported video path, duration and submission link |       |
| Public repository URL and logged-out check              |       |
| Optional hosted demo URL and access-control check       |       |
| Final data scan / hook verification evidence            |       |

The challenge judges clinical impact, technical quality/AI and execution equally
(33.3% each). The recording should demonstrate task relevance, source inspection,
honest gaps and an end-to-end workflow; research size never substitutes for those.
