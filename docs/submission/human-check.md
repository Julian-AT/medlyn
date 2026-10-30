# Human check: five situations and findings

For the person checking the final app before metrics publication. This is a blank
review sheet, not a completed evaluation. Check all 15 answers and all eight finding
fixtures. Return signed aggregate counts to the orchestrator for `METRICS.md`.
See the [submission checklist](checklist.md) and [recording script](../video-script.md).

## Instructions

1. Record the app commit, corpus revision, browser, date and reviewer below. Use
   `patient-0000-0001`, Anna Musterfrau, as of **15 Apr 2016**, all eight eligible
   documents, real engine mode and an empty review layer. Use `/reviews` to reset;
   confirm the machine findings are restored. Do not dismiss findings during scoring.
2. At `/situations`, enter each original title and description from the local
   `TRACK-1-clinical-documentation/cases/situations.md`, or use its matching chip.
   Do not feed the checking questions or expected answers into the app. They are
   for the reviewer only. Questions below are paraphrased; expected values come
   from the local `cases/expected.json` and the PRD finding fixtures.
3. After the complete screen renders, score **Visible without clicking** first.
   Scrolling is allowed. The answering text must already be rendered, without
   expanding a card, opening an artifact, asking chat or opening a citation.
   Route/card names below are navigation aids; record the actual answering card.
4. Then score **Correct** against every expected component, including units, dose,
   schedule and source date. Medication lists must show their source/date, such as
   discharge medication on 15 Apr 2016. A June 2015 result must not appear as a
   newly measured April 2016 result. Preserve C1 uncertainty even when the short
   expected answer names the left side.
5. Open source chips only after scoring visibility. Score **Linked source** yes
   only if at least one expected document opens the correct highlighted sentence
   or table row and supports the displayed answer. For multi-part answers, inspect
   every supporting component. Findings must link **all** relevant passages. Mark
   pure absence rows `n/a` in this column; no fabricated source link is required.
6. “Not documented” is correct only after exhaustive checks of all eight eligible
   documents succeed. Record the displayed coverage. **Couldn't check**, retry,
   loading and an unchecked gap do not pass. No recorded completion is not proof
   that the patient did not attend. Do not infer kidney impairment from missing labs.
7. Fill only `y` or `n` in the first two result columns; use `y`, `n` or the allowed
   `n/a` in Linked source. Leave uncertain rows unscored and explain them. Notes
   should contain card names and `documentId@start–end` references, not copied
   document text. Keep screenshots, detailed evidence and filled private notes local.
8. Do not change expected answers to fit output. Report failures to the owning
   lane, then rerun affected rows on the corrected version with a new run identity.
   Do not open blind held-out inputs/results or run real/all evaluation here.

| Run field                                       | Value |
| ----------------------------------------------- | ----- |
| Reviewer / date / timezone                      |       |
| App commit / app origin                         |       |
| Corpus revision / evidence window               |       |
| Browser / viewport / theme                      |       |
| Active patient / eligible documents             |       |
| Review session / reset verified                 |       |
| Cold/warm run IDs and private evidence location |       |

## Fifteen regression questions

All routes below refer to the patient app. Chip names are the current labels;
card titles may vary slightly while the required content stays the same. Source
document IDs identify evidence without publishing challenge passages.

| ID  | Question                                                              | Expected answer and source documents                                                                                                                                                                                                                                                    | Where to look: route + card                                                                                                    | Visible without clicking (y/n) | Correct (y/n) | Linked source (y/n) | Notes |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------- | ------------------- | ----- |
| 1.1 | Which blood thinner and dose are documented?                          | Acetylsalicylic acid (Thrombo ASS), 100 mg each morning, 1-0-0. Sources: 12340011, 12340012 or 12340018.                                                                                                                                                                                | `/situations` → Anaesthesia pre-op → **Antithrombotics**                                                                       |                                |               |                     |       |
| 1.2 | What allergy and reaction are recorded?                               | Contrast media allergy; nausea, dizziness and vomiting. Sources: 12340012 or 12340018.                                                                                                                                                                                                  | `/situations` → Anaesthesia pre-op → **Allergies**                                                                             |                                |               |                     |       |
| 1.3 | What is the latest recorded LVEF and its date?                        | 60%, normal systolic function, echocardiography in June 2015. Source: 12340012.                                                                                                                                                                                                         | `/situations` → Anaesthesia pre-op → **Cardiac function**                                                                      |                                |               |                     |       |
| 2.1 | What are the tumour histology and TNM stage?                          | Left breast invasive ductal carcinoma, T2 N0 M0 V0 G2; April 2016 core biopsy. Sources: 12340016 or 12340018.                                                                                                                                                                           | `/situations` → Surgery after tumour board → **Histology, grade and TNM**, **Diagnosis and side**                              |                                |               |                     |       |
| 2.2 | What are ER, PR, HER2 and Ki-67?                                      | ER positive 100%, Allred 8; PR positive 70%, Allred 7; HER2 negative; Ki-67 20%. Source: 12340016.                                                                                                                                                                                      | `/situations` → Surgery after tumour board → **Receptors and Ki-67**                                                           |                                |               |                     |       |
| 2.3 | What operation/treatment was recommended and when?                    | Quadrantectomy plus intraoperative radiotherapy (IORT), scheduled for 16 May 2016. Source: 12340018.                                                                                                                                                                                    | `/situations` → Surgery after tumour board → **Tumour board recommendation** / **Procedure and date**                          |                                |               |                     |       |
| 3.1 | Which diabetes drugs, doses and schedules are documented?             | Metformin (Glucophage) 1000 mg 1-1-1; pioglitazone (Actos) 30 mg 0-1-0; exenatide (Byetta) 5 µg subcutaneous 1-0-1. Sources: 12340012 or 12340018.                                                                                                                                      | `/situations` → GP diabetes review → **Glucose-lowering medicines**                                                            |                                |               |                     |       |
| 3.2 | What is the latest HbA1c and when was it measured?                    | 6.4% in June 2015; no later value documented. Sources: 12340011 or 12340012.                                                                                                                                                                                                            | `/situations` → GP diabetes review → **HbA1c**                                                                                 |                                |               |                     |       |
| 3.3 | How did weight change from June 2015 to April 2016?                   | 78 kg in June 2015, 67 kg on 4 Apr 2016, 66 kg during the April 2016 admission; about 12 kg lost. Sources: 12340012, 12340014 and 12340018.                                                                                                                                             | `/situations` → GP diabetes review → **Weight trend**                                                                          |                                |               |                     |       |
| 4.1 | Were similar symptoms recorded before, and what cause was attributed? | June 2015 hypertensive crisis, dizziness and transient left-eye vision loss (amaurosis fugax), attributed to up to 60% left internal carotid stenosis. Preserve the C1 side-discrepancy warning. Sources: 12340011 or 12340012.                                                         | `/situations` → Emergency dizziness → **Prior similar episodes**, **Carotid stenosis and side**                                |                                |               |                     |       |
| 4.2 | What matters in the record before iodinated contrast?                 | Contrast allergy with nausea/dizziness/vomiting; 2015 head CT without contrast for that reason; metformin 1000 mg 1-1-1; kidney function **not documented**, successfully checked across 8/8 documents. Sources for positive facts: 12340012 or 12340018; absence needs no source link. | `/situations` → Emergency dizziness → **Before contrast** / **Allergies**, **Glucose-lowering medicines**, **Kidney function** |                                |               |                     |       |
| 4.3 | Which blood pressure medicine and dose are documented in April 2016?  | Candesartan (Blopress), 16 mg 1-0-1, in the April 2016 source-labelled list. Source: 12340018.                                                                                                                                                                                          | `/situations` → Emergency dizziness → **Blood pressure medicines**                                                             |                                |               |                     |       |
| 5.1 | Which follow-ups were recommended at the June 2015 discharge?         | Carotid duplex in two months, regular eye checks, regular blood pressure checks and GP medication adjustment. Sources: 12340011 or 12340012.                                                                                                                                            | `/situations` → Open follow-ups → **Discharge recommendations** / **Open follow-ups**, **Eye findings and follow-up**          |                                |               |                     |       |
| 5.2 | Is completion of the follow-up carotid ultrasound recorded?           | Not documented in any of the eight documents; display successful 8/8 coverage. This does not establish that the test never occurred. No source link required; enter `n/a`.                                                                                                              | `/situations` → Open follow-ups → **Carotid duplex completion** / **Open follow-ups**                                          |                                |               |                     |       |
| 5.3 | Which side is the carotid stenosis on in the record?                  | Left internal carotid stenosis, up to 60%, is the short expected answer; the conflicting right-side finding must also be flagged as C1, not silently resolved. Sources: 12340008, 12340011 or 12340012.                                                                                 | `/situations` → Open follow-ups → **Carotid stenosis and side**                                                                |                                |               |                     |       |

## Five qualifying contradictions

Check the contradiction summaries on `/open-questions`, then open the comparator
and every source. Also verify each relevant Situations card carries its warning.
IDs C1–C5 are reviewer fixture names; the live app can use hashed finding IDs.
The explanation, event identity and passage set establish the match.

| ID  | Check question                                                                         | Expected finding and evidence references                                                                                                                                                                                                                                                                                                        | Where to look: route + card/list                                                                                                                         | Visible without clicking (y/n) | Correct (y/n) | Linked source (y/n) | Notes |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------- | ------------------- | ----- |
| C1  | Does one carotid report disagree with itself about side?                               | High severity contradiction: detailed finding places the 60% stenosis on the right, while the same report's assessment/diagnosis places it on the left. Compare 12340012 near @3527 and @3716 with 12340012@3969–4033 and @194–219; supporting left-side report 12340008 near @430. Include all PRD passages, not just two convenient snippets. | `/situations` → Emergency dizziness or Open follow-ups → **Carotid stenosis and side**; `/open-questions` → **Contradictions** → carotid-side comparator |                                |               |                     |       |
| C2  | Does the June 2015 BMI match that letter's height and weight?                          | Medium severity contradiction: 170 cm and 78 kg imply BMI about 27.0, versus stated 29.4; rounding interval 26.7–27.3. Reference: 12340012@1697–1735. Link height, weight and BMI operands even if they share one passage.                                                                                                                      | `/situations` → GP diabetes review → **BMI**; `/open-questions` → **Contradictions** → June 2015 BMI                                                     |                                |               |                     |       |
| C3  | Does the April 2016 BMI match that letter's height and weight?                         | Medium severity contradiction: 171 cm and 67 kg imply BMI about 22.9, versus stated 29; rounding interval 22.6–23.2. Reference: 12340014@635–671. Keep separate from C2.                                                                                                                                                                        | `/situations` → GP diabetes review → **BMI**; `/open-questions` → **Contradictions** → April 2016 BMI                                                    |                                |               |                     |       |
| C4  | Are two collection dates given for the same biopsy?                                    | Medium severity contradiction: 11 Apr versus 12 Apr 2016. References: 12340016@187–212; 12340018@1054–1109 and @1226–1290; matching histology/TNM near 12340018@1381 establishes same-event identity. Do not count collection versus report dates alone as a contradiction.                                                                     | `/open-questions` → **Contradictions** → biopsy collection date; inspect Surgery after tumour board histology context                                    |                                |               |                     |       |
| C5  | Does the same discharge have an impossible header year and a different narrative date? | Low severity contradiction: header has year 20156, narrative has 15 Apr 2016, likely a typo. References: 12340018@145–194 and @2348–2382. Show the discrepancy without silently repairing the source.                                                                                                                                           | `/open-questions` → **Contradictions** → discharge date                                                                                                  |                                |               |                     |       |

## Three clarification requests, excluded from the contradiction count

These are the PRD's three D fixtures. They are possible discrepancies with unresolved
context, not additional proven contradictions. Both labels and placement matter.

| ID  | Check question                                                         | Expected finding and evidence references                                                                                                                                                                                                                                                       | Where to look: route + card/list                                                                                   | Visible without clicking (y/n) | Correct (y/n) | Linked source (y/n) | Notes |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------- | ------------------- | ----- |
| D1  | Are the two admission dates explained by different admission contexts? | Needs clarification: 10 Apr versus 12 Apr 2016; hospital versus ward admission is possible, not established. References: 12340018 near @145 and @1637–1710; planned admission in 12340014@1158–1189. Show both dates with uncertainty.                                                         | `/open-questions` → **Needs clarification** → admission date; `/patient/timeline` for context                      |                                |               |                     |       |
| D2  | Do the axillary node statements refer to the same side/examination?    | Needs clarification: enlarged right axillary nodes versus later no enlarged nodes and N0 staging; dates/examinations differ and the later ultrasound side is unspecified. References: 12340014@1016–1054; 12340018@1340–1378; 12340016@925–941. Do not promote this to a proven contradiction. | `/situations` → Surgery after tumour board → **Axillary lymph nodes**; `/open-questions` → **Needs clarification** |                                |               |                     |       |
| D3  | Are the case numbers proven to share an identifier scope?              | Needs clarification: identifiers 20150610 and 20160410 differ, but a shared scope is not established. References: 12340018@128–142 and 12340016@105–119. No assertion of a wrong patient or wrong case.                                                                                        | `/open-questions` → **Needs clarification** → case identifiers                                                     |                                |               |                     |       |

References use normalised-text UTF-16 offsets from the PRD. “Near” references are
starting points, not asserted full quotation spans. Confirm exact live segment
boundaries in the popup; record final `documentId@start–end` references locally.

## Whole-screen audit and sign-off

The 15 answers alone cannot establish 100% traceability or zero invented facts.
Audit every displayed fact on all five complete screens, including demographics,
extra cards, headlines, units, dates, calculated values and their operands. Check
the absence state independently. Do not count an unsupported clinician annotation
as a sourced fact. Review annotations should be absent in this run.

| Audit result                                                                                                                     | Value / evidence reference |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Correct AND visible answers with required sources / 15                                                                           |                            |
| Correctly linked displayed facts / all displayed facts, with percentage                                                          |                            |
| Unsupported displayed facts, target 0                                                                                            |                            |
| Unique qualifying contradictions C1–C5 shown with all passages / 5                                                               |                            |
| Additional true contradictions, if independently verified                                                                        |                            |
| Unique false alarms, including dismissal-fixture regressions                                                                     |                            |
| Net contradictions = unique true contradictions minus false alarms                                                               |                            |
| D1–D3 correctly separated / 3, excluded from net score                                                                           |                            |
| Healthy absence checks complete; unavailable states counted as failures                                                          |                            |
| Dismissal controls: changing candesartan dose, small cross-date measurements, consistent final BMI remain off contradiction list |                            |
| GP letter precision/recall, omissions and unsupported edits reviewed separately                                                  |                            |

Measure load time from submitting the situation to the last rendered section of
the complete screen, including late claims/findings. Record first-card time
separately if measured. Use one consistent setup and record the cache state; do
not report server timings or cache-generation time as browser completion time.

| Situation chip             | Cold submit-to-complete (s) | Warm submit-to-complete (s) | Run IDs / notes |
| -------------------------- | --------------------------- | --------------------------- | --------------- |
| Anaesthesia pre-op         |                             |                             |                 |
| Surgery after tumour board |                             |                             |                 |
| GP diabetes review         |                             |                             |                 |
| Emergency dizziness        |                             |                             |                 |
| Open follow-ups            |                             |                             |                 |
| Slowest of five            |                             |                             |                 |

Challenge latency target: slowest <10 s. PRD targets are stricter: complete <5 s
cold, cached <1 s, first card <1.5 s. Report each threshold honestly.

| Final sign-off                              | Value |
| ------------------------------------------- | ----- |
| Reviewer signature / date                   |       |
| Second reviewer, if used                    |       |
| Failures and unresolved rows                |       |
| Approved aggregate figures for `METRICS.md` |       |
| Review layer reset after checks             |       |

Publish aggregate counts and limitations after sign-off. Do not publish filled
notes containing challenge passages, private captures or blind evaluation material.
