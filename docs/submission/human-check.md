# Completed challenge review

**Agent-reviewed (Codex), not clinician-reviewed.** 30 October 2026,
10:50–10:52 Europe/Vienna. The user delegated this check to an agent. No clinician
or second reviewer signed off. See [METRICS.md](../../METRICS.md) for aggregates.

## Run and method

| Field              | Recorded value                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Origin / mode      | `http://localhost:3000`; all lens responses HTTP 200, `X-Medlyn-Mode: live`                                       |
| HEAD               | `3f1cc64800e02818bd60dfb85e9f19c5e91a1251`; concurrent uncommitted changes                                        |
| Patient / window   | `patient-0000-0001`; `rev-48798dc84d07`; `2016-04-15`; eight eligible documents                                   |
| Documents          | 12340008, 12340009, 12340010, 12340011, 12340012, 12340014, 12340016, 12340018                                    |
| Review session     | `agent-human-check-20261030`; GET `/api/review` returned `[]` before and after; no reviews written                |
| Browser / viewport | Not exercised. Visibility means answering lines already in reconstructed screen data, as requested for this lane. |
| Private evidence   | `/private/tmp/medlyn-human-check-20261030/`: 25 NDJSON captures, 120 passage responses, facts and audit records   |

Original titles/descriptions were loaded at runtime from local `cases/situations.md`
beside the configured patient corpus. Questions and expected answers were read
separately from `cases/expected.json` and never sent to the lens. Each situation
used POST `/api/lens` with its original text and `noCache: true`, then its chip ID
and `noCache: true`. Further requests exercised fills and confirmed cache hits.
All used the same empty review session and patient cookie.

The reviewer reconstructed screens from situation, section, headline, findings
and done events. Supported, uncollapsed answering lines counted as visible.
Source checks used GET `/api/passage/<segmentId>`, verified patient/revision, and
compared UTF-16 offsets with runtime-normalised documents. An absence answer
required `kind: absence`, supported validation and successful recorded 8/8 coverage.
The absence/render/claim path was inspected: lexical and full-document passes
must complete; failures become unavailable. The payload has no independent
per-document execution trace: 8/8 is the engine's recorded coverage. No blind
inputs/results were opened and no real/all suite ran.

## Fifteen primary cold checks

`y/y/y` means **visible in screen data / correct / linked expected source**.
Text and chip columns are independent runs, each with denominator 15. Only a
pure absence answer permits `n/a` for its source. References contain no passages.

| ID  | Answer checked                                                 | Text V/C/S | Chip V/C/S | Answering cards and verified references                                                                                                                   |
| --- | -------------------------------------------------------------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Blood thinner, dose and schedule                               | y/y/y      | y/y/y      | `antithrombotics`; 12340018-s54, 12340018@2571–2604                                                                                                       |
| 1.2 | Contrast allergy and three reactions                           | y/y/y      | y/y/y      | `allergies`; 12340018-s18, 12340018@443–487                                                                                                               |
| 1.3 | EF, systolic function and June 2015 date                       | y/y/y      | y/y/y      | `cardiac_function`; 12340012-s65, 12340012@2797–2837                                                                                                      |
| 2.1 | Histology, side, T2 N0 M0 V0 G2 and biopsy context             | y/y/y      | y/y/y      | `histology_tnm`, `diagnosis_side`; 12340016-s10/s16/s22, 12340016@841–942; grade also 12340018@341–355                                                    |
| 2.2 | ER/PR percentages, Allred scores, HER2, Ki-67                  | y/y/y      | y/y/y      | `receptors_ki67`; 12340016-s19/s20, 12340016@607–821                                                                                                      |
| 2.3 | Board recommendation, IORT and planned date                    | y/y/y      | y/y/y      | `tumour_board`, `procedure_date`; 12340018-s47/s51, 12340018@2074–2195 and @2412–2509                                                                     |
| 3.1 | Three diabetes drugs, doses, schedules and exenatide route     | y/y/y      | y/y/y      | `diabetes_drugs`; 12340018-s55/s60/s61, 12340018@2605–2638, @2774–2800, @2801–2849                                                                        |
| 3.2 | Latest HbA1c/date; no later result                             | y/y/y      | y/y/y      | `hba1c`, `completion_later_hba1c`; 12340012-s97, 12340012@4885–4899; supported absence 8/8                                                                |
| 3.3 | Three dated weights and about 12 kg loss                       | y/y/y      | y/y/y      | `weight_trend`; 12340012@1711–1725; 12340014@168–313 and @649–663; 12340018@935–949; 78 − 66 = 12                                                         |
| 4.1 | Earlier episode, symptoms, timing and attributed carotid cause | y/y/y      | y/y/y      | `prior_episodes`, `carotid_stenosis`; 12340011-s9/s14; 12340012-s105/s116, 12340012@5572–5743 and @7147–7273; C1 retained                                 |
| 4.2 | Allergy/reactions, noncontrast CT, metformin and renal absence | y/y/y      | y/y/y      | `contrast_risks`, `kidney_function`; 12340012-s111, 12340012@6329–6407; 12340018-s18/s55; supported renal absence 8/8                                     |
| 4.3 | April 2016 BP medicine, dose and schedule                      | y/y/y      | y/y/y      | `antihypertensives`; 12340018-s57, 12340018@2666–2695; earlier list separately dated                                                                      |
| 5.1 | Duplex timing, eye checks, BP checks, GP adjustment            | y/y/y      | y/y/y      | `discharge_recommendations`, `open_followups`; 12340012-s114/s117/s118, 12340012@6832–6945, @7348–7393, @7394–7461; Aug 2015 equals two months after June |
| 5.2 | No recorded follow-up duplex completion                        | y/y/n/a    | y/y/n/a    | `completion_carotid_duplex`; supported absence 8/8; does not assert the test never occurred                                                               |
| 5.3 | Left/up-to-60% account with C1 uncertainty                     | y/y/y      | y/y/y      | `carotid_stenosis`; 12340008-s20, 12340008@872–936; card contradicted, C1 includes both accounts                                                          |

**Primary cold: 15/15 text, 15/15 chip.** Each has 14/14 sourced answers plus one
valid pure-absence answer. This is not a browser or clinician score.

## Findings and dismissal checks

All eight findings appeared in all 25 payloads. The checks establish identity,
classification, support and complete passage sets; no claim that the comparison
dialog was open without clicking.

| Fixture | Live ID suffix         | Classification      | Supported passages | Checked references                                                                                                                     |
| ------- | ---------------------- | ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| C1      | `586fa2347bf6e19c84bb` | contradiction       | 7/7                | 12340008@430–604, @605–617; 12340012@3527–3702, @3703–3715, @3716–3872, @3969–4033, @194–219                                           |
| C2      | `e39e150519208ef96369` | contradiction       | 3/3                | 12340012@1697–1710, @1711–1725, @1726–1735; recomputed 27.0, rounding 26.7–27.3 versus 29.4                                            |
| C3      | `970ac90e969ba5cb2356` | contradiction       | 3/3                | 12340014@635–648, @649–663, @664–671; recomputed 22.9, rounding 22.6–23.2 versus 29                                                    |
| C4      | `c8f664097cc961cee53b` | contradiction       | 6/6                | 12340016@841–942, @187–212; 12340018@1054–1110, @1226–1291, @1381–1407, @1425–1526; matching summary/TNM establishes specimen identity |
| C5      | `113c958bfaaa6de47023` | contradiction       | 2/2                | 12340018@2317–2390, @170–194; same discharge, malformed date preserved                                                                 |
| D1      | `a88d9c5139124061cc38` | needs clarification | 3/3                | 12340014@1121–1190; 12340018@1619–1711, @145–168; hospital/ward hypothesis unresolved                                                  |
| D2      | `873e214b4a453acb35ea` | needs clarification | 3/3                | 12340014@1001–1055; 12340016@925–941; 12340018@1314–1379; different dates/examinations, later side unspecified                         |
| D3      | `cfb0980de93c95477056` | needs clarification | 2/2                | 12340016@105–119; 12340018@128–142; identifier scope unresolved                                                                        |

**5 true − 0 false alarms = 5 net**; D1–D3 excluded. No extra true contradiction
claimed. All six PRD dismissal categories stayed off the findings list: cross-date
weight, height variation, BP variation, candesartan dose change, allergy-reaction
omission and JSON differences. Consistent final BMI was not its own contradiction.
Some broad cards inherit unrelated same-segment warnings: the weight-trend card
can inherit C5. No false finding does not establish perfect badge placement.

## Traceability and unsupported lines

Across 25 requests, the agent compared **167 distinct supported non-absence card
lines** with source text, including 166 cited facts and a derived weight change
with two operands. **0 unsupported card lines found**. All 166 fact quotes matched
runtime-normalised document offsets. All 168 line-to-fact associations also
matched live passage text. All 120 unique passage endpoints returned HTTP 200
for the correct patient/revision. All 29 finding quotes matched their offsets.
The ten cold screens contain 413 line occurrences, representing 150 claim IDs.

Seeded random shuffle: `20261030`. Each sampled quote was located and its meaning
supported; repeated checks are not independent patients or trials.

| Sample | Source reference   | Segment       | Located/supported |
| ------ | ------------------ | ------------- | ----------------- |
| 1      | 12340011@418–434   | 12340011-s12  | y/y               |
| 2      | 12340009@460–495   | 12340009-s16  | y/y               |
| 3      | 12340018@2412–2509 | 12340018-s51  | y/y               |
| 4      | 12340012@3716–3872 | 12340012-s77  | y/y               |
| 5      | 12340008@430–604   | 12340008-s15  | y/y               |
| 6      | 12340014@889–942   | 12340014-s31  | y/y               |
| 7      | 12340010@258–284   | 12340010-s13  | y/y               |
| 8      | 12340014@707–722   | 12340014-s26  | y/y               |
| 9      | 12340012@5491–5522 | 12340012-s103 | y/y               |
| 10     | 12340016@893–941   | 12340016-s22  | y/y               |

Scope excludes demographics, chat, speech, letters and clinician annotations.
This does not establish globally zero hallucinations or clinician gold.

## Timing and repeat failures

Seconds from client POST to stream completion, including findings/done:
**API timings, not browser rendering**. Cold bypasses lens cache only. Warm
entries explicitly reported `timings.cached: true`.

| Situation      | Text cold  | Chip cold | Text cached | Chip cached |
| -------------- | ---------- | --------- | ----------- | ----------- |
| 1, anaesthesia | 6.116      | 6.179     | 0.107       | 0.111       |
| 2, surgery     | 6.954      | 4.998     | 0.057       | 0.110       |
| 3, diabetes    | 7.762      | 5.853     | 0.175       | 0.122       |
| 4, emergency   | 7.701      | 5.411     | 0.239       | 0.178       |
| 5, follow-ups  | 10.138     | 4.946     | 0.077       | 0.080       |
| Slowest        | **10.138** | **6.179** | **0.239**   | **0.178**   |

Primary IDs: `s<N>-text-cold`, `s<N>-chip-cold`. Cached text IDs:
`s1-text-warm-confirmed`, `s2-text-warm`, `s3-text-warm-confirmed`,
`s4-text-warm-recheck`, `s5-text-warm-confirmed`. Cached chips: `s<N>-chip-warm`.
Full timestamps and server/client timing fields remain in private captures.

| Additional observation                                   | Outcome                                                                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `s1-text-warm`, actually uncached                        | 7.514 s cache fill; subsequent confirmed hit                                                                               |
| `s3-text-warm`, actually uncached                        | 8.220 s cache fill; subsequent confirmed hit                                                                               |
| `s4-text-warm`, actually uncached                        | 4.508 s; 12 unavailable cards; 4.1/4.2 fail, 4.3 passes: 1/3                                                               |
| `s4-text-warm-confirmed`, actually uncached despite name | 11.343 s; answers recovered; later `warm-recheck` confirmed cache hit                                                      |
| `s5-text-warm`, actually uncached                        | 12.943 s; carotid card `conflict: none` despite global C1                                                                  |
| `s5-text-warm-confirmed`                                 | C1 card badge still missing; strict warning requirement fails 5.3: 2/3                                                     |
| `s2-chip-warm`                                           | HER2/Ki-67 supported by 12340018, but expected 12340016 not cited for those components; strict source check fails 2.2: 2/3 |

Primary cold 15/15 cannot become an all-runs claim. Confirmed cached chip results
have **14/15 strict expected-source passes**; confirmed cached text has **14/15
when requiring C1 on the answering card**. C1 remains correctly classified globally.
All ten confirmed API cache hits were <1 s. The <10 s challenge and <5 s PRD cold
targets failed. Cold first-section arrival was 1.910–5.037 s. Browser completion,
responsive layout and citation-click behaviour remain unverified.

## Sign-off and requests

Completed by **Agent-reviewed (Codex), not clinician-reviewed**, 30 October 2026.
No source passages/screenshots published. No expectations or engine code changed.
Empty review session confirmed afterwards. No GP letter score asserted. Older
automated runs and separate research pointers are identified in
[METRICS.md](../../METRICS.md).

Orchestrator: investigate unavailable sections, cache selection/badge differences,
and expected-source coverage on cached receptor answers; rerun on a frozen commit
and perform browser/clinician review.
