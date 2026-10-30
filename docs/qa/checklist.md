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

### Workflow verification — 30 Oct 2026, 12:07–12:16 Europe/Vienna

Agent-reviewed (Codex), not clinician-reviewed. Live API checks used both
`http://localhost:3000` and `https://app.medlyn.health`. Local HEAD during the
checks was `a274f19a67368b4cd4dd67e7c93e96f2cf1d51ee`, with concurrent working-tree
changes; this is not a frozen-release certification. Both environments returned
patient `patient-0000-0001`, corpus `rev-48798dc84d07`, as of `2016-04-15`, eight
eligible documents, and `X-Medlyn-Mode: live`.

Browser verification is **blocked**, not passed: agent-browser could not write its
socket directory under the sandbox, no connected browser was available, and
computer-use approval denied Chrome access. No screenshot, click, hydration,
responsive-layout or print-pagination pass is claimed. The changes below are
local until the orchestrator deploys them. Production letter generation/editing
and chat were not invoked because production calls were restricted to reads and
isolated review writes.

Private captures and scripts: `/private/tmp/medlyn-workflow-verify-20261030/`.
They contain runtime evidence and must remain outside git. The check did not run
real/all evaluation or inspect held-out inputs/results. METRICS.md remains unchanged.

| Check / request                                              | Local result                      | Production result                 | Response evidence / limitation                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/situations`, `/open-questions`, `/letter`, `/reviews`  | Pass HTTP; 275/597/436/383 ms     | Pass HTTP; 318/118/133/196 ms     | All HTTP 200. This does not certify client rendering.                                                                                                                                                                                                    |
| POST `/api/lens`, five chip IDs                              | Pass stream; 204/49/44/48/44 ms   | Pass stream; 171/114/85/116/94 ms | `done`, live mode, 17/12/16/14/8 cards, zero unavailable; all cached. Card data identical across origins.                                                                                                                                                |
| Typed: `Anaesthetist preparing for breast surgery`           | Pass stream; 6,684 ms             | Pass stream; 86 ms                | 17 cards, `done`; local uncached, production cached.                                                                                                                                                                                                     |
| Typed: `GP reviewing open follow-ups from the hospital stay` | Pass stream; 7,999 ms             | Pass stream; 123 ms               | 8 cards, `done`; local uncached, production cached.                                                                                                                                                                                                      |
| Typed: `Dentist before a tooth extraction`                   | Pass stream; 88 ms                | Pass stream; 103 ms               | 5 cards, `done`, internal parser tier 3; no tier label in the workflow UI. Both cached.                                                                                                                                                                  |
| Cold performance target                                      | Fail PRD <5 s                     | Not measured cold                 | The two uncached typed requests exceeded 5 s. Cached API timing does not establish browser timing.                                                                                                                                                       |
| GET `/api/patient/findings` without running a situation      | Pass API                          | Pass API                          | Five contradictions and three clarification items, all eight eligible documents.                                                                                                                                                                         |
| Comparator source completeness                               | Pass data/code; click blocked     | Pass data; click blocked          | C1–C5 passage counts 7/3/3/6/2; D1–D3 counts 3/3/2. All 29 passage requests HTTP 200 per origin; quote offsets, patient and revision match. Comparator maps every passage without collapsing.                                                            |
| Proven gaps                                                  | Pass data/code                    | Pass data                         | Supported absence claims and `searched: {eligible:8,total:8,asOf:"2016-04-15"}`. Kidney gap includes the searched-8-of-8 wording. Local completion cards now also show date/count and a View documents checked action.                                   |
| Failed check versus absence                                  | Fixed locally; focused tests pass | Existing deployment not certified | Unavailable checks now say Couldn't check, explain retry, and appear under Checks to retry rather than Documentation gaps. Missing card provenance also cannot receive a Not documented badge.                                                           |
| Review accept / leave open / dismiss                         | Pass API + projection             | Pass API + local projection       | POST 201; GET ledger returns entries. Confirmed badge; unresolved question retained; dismissed finding/question hidden. Passage data unchanged. Production server projection itself was not separately rendered.                                         |
| Supported / unsupported correction                           | Pass API + projection             | Pass API + local projection       | Supported label-only correction replaces the displayed fact; unsupported text stays an annotation. Source metadata was excluded from proposed text because correction validation is against the original passage.                                        |
| Review reset                                                 | Pass API + projection             | Pass API + local projection       | DELETE 200, subsequent GET `[]`, exact machine-screen restoration in the pure overlay. Both isolated sessions reset after all writes.                                                                                                                    |
| Investigate context and stream                               | Pass API; final request 21,690 ms | Not invoked                       | HTTP 200 SSE, matching lens key/window, eight successful tool outputs, `finish`, no error events. Visible request now uses plain language instead of tool names/internal IDs. Navigation/click and completeness of the rendered answer remain unchecked. |
| GP letter from situation                                     | Pass API; 3,580 ms                | Not invoked                       | HTTP 201, nine sections, 26 supported factual claims, all cited, three completion absences, carotid clarification.                                                                                                                                       |
| GP letter without a situation                                | Pass API; 4,783 ms                | Not invoked                       | HTTP 201; nine sections, 26 supported/cited factual claims, three absence claims.                                                                                                                                                                        |
| Letter edit                                                  | Pass API                          | Not invoked                       | Unsupported edit retained original body and added annotation; supported edit revalidated. POST 200 in 440/374 ms in the repeated workflow pass.                                                                                                          |
| Letter correction/dismissal flags                            | Pass API + focused tests          | Not invoked                       | Original text preserved; proposed correction and dismissed-clarification flags shown. Reopening a dismissed finding now removes its stale dismissal flag; unsupported-edit warning remains.                                                              |
| Reviews ledger wording                                       | Fixed locally; typechecked        | Existing deployment not certified | Uses readable item titles when available and identifies unsupported corrections as Clinician note; no internal IDs displayed.                                                                                                                            |
| Labels, reasons and empty states                             | Fixed locally; typechecked        | Existing deployment not certified | Explained, keyboard-focusable status badges; visible gap reasons; dated situation summary; clear next actions; readable letter review warnings. Visual legibility remains unchecked.                                                                     |
| Print / citation footnotes                                   | Code present; browser blocked     | Browser blocked                   | Print action and numbered source references exist. Pagination, clipping, page breaks and actual PDF appearance remain unverified.                                                                                                                        |

The five chip screens were compared with all 15 expected checks in
[human-check.md](../submission/human-check.md). These are **API screen-data**
passes, not browser visibility or clinician sign-off. No answers are hidden behind
an expansion in the owned fact-card rendering path, but actual visibility still
requires the browser gate.

| Question | Local / production screen data | Checked card(s) / expected source reference                                                    |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1.1      | Pass / Pass                    | Antithrombotics; `12340018-s54`                                                                |
| 1.2      | Pass / Pass                    | Allergies; `12340018-s18`                                                                      |
| 1.3      | Pass / Pass                    | Cardiac function; `12340012-s65`                                                               |
| 2.1      | Pass / Pass                    | Histology and diagnosis side; `12340016-s10/s22`, biopsy context present                       |
| 2.2      | Pass / Pass                    | Receptors and Ki-67; `12340016-s19/s20`, percentages and Allred scores present                 |
| 2.3      | Pass / Pass                    | Tumour board and procedure date; `12340018-s47/s51`                                            |
| 3.1      | Pass / Pass                    | Diabetes medicines; `12340018-s55/s60/s61`                                                     |
| 3.2      | Pass / Pass                    | HbA1c; `12340012-s97`, plus supported later-result absence                                     |
| 3.3      | Pass / Pass                    | Weight trend; `12340012-s36`, `12340014-s22`, `12340018-s25`, derived change                   |
| 4.1      | Pass / Pass                    | Prior episodes and carotid context; `12340011-s9/s14`, `12340012-s105/s116`; C1 retained       |
| 4.2      | Pass / Pass                    | Contrast risks and kidney gap; `12340012-s111`, `12340018-s18/s55`, 8/8 absence                |
| 4.3      | Pass / Pass                    | Dated antihypertensive lists; `12340018-s57`, earlier list separately dated                    |
| 5.1      | Pass / Pass                    | Discharge recommendations; `12340012-s114/s117/s118`                                           |
| 5.2      | Pass / Pass                    | Supported completion absence, eight eligible documents; no claim that follow-up never occurred |
| 5.3      | Pass / Pass                    | Carotid card includes `12340008-s20` and the C1 contradiction link                             |

Test harness corrections: an initial correction request lacked proposed text
because the fact-identity endpoint returns only ID/hash (409); a later attempt
included metadata absent from the original passage and was correctly unsupported.
The final runs use runtime-loaded fact labels. A local projection assertion also
initially selected a letter-only fact absent from that screen; the final check
uses a fact shared by the letter and screen. These were harness errors, not
successful feature checks. All attempted sessions were reset afterwards.

Fresh verification: app and engine `pnpm exec tsc --noEmit` both exit 0;
focused Vitest reports `Test Files 13 passed (13)` / `Tests 71 passed (71)`.
The final production webpack build exits 0: compilation, TypeScript, 26 static
pages and trace collection succeed. Owned-file Biome checks 22 files with no
fixes; the data hook checks 23 paths including 120-character source-passage
matching; owned diff whitespace check passes. No contract/schema/dependency edits
were made.

Outstanding gates for the orchestrator: deploy the owned fixes; perform actual
local/production browser clicks for chips, typed input, comparator, tooltips,
review menus, navigation and the ledger; visually inspect letter print/PDF;
exercise production letter/chat within an explicitly authorised writable test
session; rerun on a frozen commit and check cold performance. This run does not
waive the older repeat/cache failures recorded in METRICS.md.
