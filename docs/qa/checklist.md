# QA checklist

Run against `pnpm dev` (port 3000) with Playwright and Chrome. Each pass ends with a screenshot per check.

## Routes (all return 200, no page errors, no hydration warnings)

`/`, `/chats`, `/patient`, `/patient/{medications,diagnoses,labs,imaging,oncology,procedures,allergies,timeline,documents}`, `/situations`, `/open-questions`, `/letter`, `/reviews`, `/research/cohort`, `/research/evaluation`.

## Interactions

| Check                               | 30 Oct, Gate 0 | Notes                                                                          |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| ⌘K search navigates                 | pass           |                                                                                |
| Situations chip run streams cards   | pass           |                                                                                |
| Source opens a readable passage     | fail           | Sources open in a side slider; replace with popups (Lane A)                    |
| Open questions → Investigate        | fail           | Page is empty until a situation runs; must show patient-wide findings and gaps |
| GP letter generate                  | fail           | Page is empty until a situation runs; must generate without one                |
| Review accept shows confirmation    | pass           |                                                                                |
| Documents reader                    | pass           | Reader to be redesigned as a dialog (Lane A)                                   |
| Patient switcher menu               | unverified     | Selector mismatch in the script; check by hand                                 |
| Chat send from home keeps the draft | pass           | Fixed with a deferred send under Strict Mode                                   |
| Hydration warning on every page     | fixed          | Random sidebar skeleton width replaced                                         |


## Workflow

30 Oct 2026 · workflow-qa · live HTTP/API checks and source review against
`http://localhost:3000`. Browser use was prohibited in this lane; no screenshots,
hydration checks, click automation or visual print verification are claimed.
Gate 0 above is historical; this pass records the current workflow separately.

| Check                           | Result                                | Evidence                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow routes                 | Pass, HTTP                            | `/situations`, `/open-questions`, `/letter`, `/reviews`: 200.                                                                                                                                                |
| Five situation chips            | Pass, live API                        | Every stream finishes with `done`; 17 / 12 / 16 / 14 / 8 cards; zero unavailable cards. Existing warm caches were allowed.                                                                                   |
| Typed situation                 | Pass, live API                        | Non-chip request streams 16 cards and finishes; 7.15 s.                                                                                                                                                      |
| Patient-wide findings           | Pass, live API                        | Five contradictions and three clarification items without opening a lens; eight eligible documents.                                                                                                          |
| Absence coverage                | Pass, API and code                    | Gap cards retain checked absence text; question coverage dialog lists the shared eligible set and opens full documents. Gaps require a completed situation.                                                  |
| Comparator and citations        | Pass, API and code                    | Finding actions open the comparator; three sampled passage requests and a full-document request return 200 with matching identities. Popovers and highlighted passages reuse the source components.          |
| Investigate                     | Pass, live API and code               | Handoff includes finding and passage references; chat executes `show_findings` and seven `show_passage` calls, with eight successful outputs and no stream errors. Browser navigation itself is unverified.  |
| Review actions                  | Pass, live API                        | Accept, supported correction, unsupported correction, dismiss with reason, and leave open persist to an isolated session.                                                                                    |
| Review overlays and reset       | Pass, live API plus engine projection | Four checks confirm card acknowledgement, independent gap availability, dismissed finding/question removal, and exact machine-screen restoration after reset.                                                |
| Patient questions review state  | Fixed, focused tests                  | Uses the shared session ledger, matches target categories, inherits source-card reviews, shows dismissal reasons and acknowledgement timestamps.                                                             |
| Active situation links          | Fixed, code                           | Links carry `lensKey`; workflow pages restore the matching session evidence.                                                                                                                                 |
| GP letter without a situation   | Pass, live API                        | 201 in 5.27 s; all nine sections; 26 factual claims supported and cited; three completion absence checks; carotid clarification cites multiple passages.                                                     |
| Letter medication               | Fixed, code and API                   | Dated discharge section rendered as a shadcn table with compact source popup chips.                                                                                                                          |
| Letter editing and review flags | Pass, live API                        | Unsupported edit becomes an annotation and preserves the body; supported edit revalidates; correction/dismissal flags preserve the original and propose an edit; reset removes ledger flags and annotations. |
| Letter continuity               | Fixed, code                           | Stores only the draft ID per session/lens and restores the authoritative saved draft when returning to the page.                                                                                             |
| Reviews table                   | Fixed, code                           | Shared ledger displays target type and ID, action, reason, author and timestamp; reset uses the same state as the situation and letter.                                                                      |
| Print                           | Pending visual verification           | Print action, numbered citations, dated document references and print CSS are present; actual pagination and popup/keyboard interaction require browser QA.                                                  |

Fresh checks: engine and app `pnpm exec tsc --noEmit` exit 0;
`Test Files 11 passed (11)` / `Tests 67 passed (67)`;
owned-file Biome passes; isolated `next build --webpack` exits 0, with 26 static
pages generated. Turbopack could not start its FSEvent watcher, so the live server
uses webpack with polling. Context7 was unavailable; installed Next.js 16.4.3
documentation and existing package types supplied the framework reference.
No held-out evaluation was run. No engine, contract, schema, dependency or
other-lane source edits were needed.
