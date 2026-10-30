# Medlyn PRD — Track 1 Clinical Documentation

Oct 30, 2026 · @Julian Schmidt

Medlyn gives one clinician the patient facts their task needs on one screen. Every card is rendered from source-linked facts, contradictions and open questions are stated explicitly, and "not documented" appears only after a full check. One GP follow-up letter demonstrates the investigate → review → draft workflow. This is version 2: it consolidates the review decisions, and Part A is the only commitment inside the 12-hour budget.

## What changed in v2

- Three parts with a budget rule: only Part A spends the 12 hours; Part B is written direction, Part C is capped research.
- One shared claim boundary for cards, spoken sentences, insights and the letter. Validation results are cached under a full identity: patient, corpus revision, evidence window, validator version.
- On screen, the model selects facts and templates render them. Only short headlines are composed, and they appear after passing their check.
- Card state is split into independent dimensions. Three availability states; "not documented" requires a full-corpus absence check.
- One evidence window (document date on or before the as-of date) for every component.
- Contradictions: five qualifying cases with exact passages. Admission date, armpit lymph nodes and case numbers move to "needs clarification".
- Review ledger: an append-only layer over the machine output. Corrections are validated; dismissals and changed sources flag letter sentences instead of rewriting them; unsupported clinician text stays an annotation; evaluation and the jury start from an empty review layer.
- P1 is now the workflow: open questions → investigate → review → GP follow-up letter. Body map, time machine, custom eval page, self-hosted toggle and hands-free voice move to P2.
- Dependencies cut to AI SDK v7, assistant-ui (dock only) and promptfoo. Vector search is out of P0.
- Every integration estimate is provisional until the proxy smoke test and a thin end-to-end slice pass (go/no-go at H+2).

## Scope and budget

Only Part A spends the 12 hours. Parts B and C exist so the larger ideas are written down without quietly consuming delivery time.

| Part                      | What                                                                                                         | Budget                                                        | Rule                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------- |
| A · Hackathon deliverable | Cockpit, workflow, GP letter, evaluation, submission                                                         | All 12 h                                                      | The only commitment                 |
| B · Product direction     | Multi-patient worklists, hands-free voice (LiveKit), PDF and scan ingestion (Docling), FHIR, real deployment | 0 build hours                                                 | Written here, not built             |
| C · Research              | Synthetic patients, labelled benchmark, verifier model on the H100                                           | One person, at most 3 h, only after the H+7 checkpoint passes | Pilot only; stops at the H+9 freeze |

| Constraint         | Status                            | Value                                                                                                     |
| ------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Time               | Confirmed                         | About 12 h from 03:37 on 30 Oct 2026                                                                      |
| GPU                | Confirmed                         | One H100 80 GB                                                                                            |
| Language models    | Confirmed                         | GPT models via a local OpenAI-compatible proxy, in env roles `MODEL_REASONING`, `MODEL_FAST`, `MODEL_STT` |
| Storage            | Confirmed                         | Neon Postgres, Drizzle ORM; branch `demo` frozen for the video                                            |
| Voice              | Confirmed                         | fish.audio text-to-speech                                                                                 |
| UI language        | Confirmed                         | English                                                                                                   |
| Repo               | Confirmed                         | Turborepo + pnpm                                                                                          |
| After the event    | Confirmed earlier: hackathon only | Parts B and C keep options open at no cost                                                                |
| Team               | Assumed                           | 3 people plus coding agents                                                                               |
| Proxy capabilities | Assumed until the smoke test      | JSON-schema output, tool calls, streaming, transcription, per-model latency                               |
| H100 access        | Assumed                           | Free now and reachable from the app                                                                       |
| Data rule          | Challenge rule                    | `data/` and database dumps never in git; a hosted demo sits behind a password                             |

## Targets

Every Part A feature moves one of these numbers or one of the three judging criteria. An answer only counts if it is visible without clicking, so the screen carries every answer; voice and the letter are extras.

| Metric          | Challenge target | Our target                                                                          | How                                                      |
| --------------- | ---------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Correct answers | 15/15            | 15/15 on the 5 situations (regression set); held-out situations reported separately | Needs library, resolver, absence check                   |
| Traceability    | 100%             | 100% of location checks pass, checked automatically                                 | A fact without a located quote never exists              |
| Invented facts  | 0                | 0 unsupported claims, measured rather than guaranteed                               | Three validation layers and one shared claim boundary    |
| Contradictions  | 5+ net           | C1–C5 shown, 0 false alarms; D1–D3 shown separately as "needs clarification"        | Definition, adjudication, fixtures                       |
| Load time       | Slowest < 10 s   | First card < 1.5 s, complete < 5 s cold (provisional until the smoke test)          | Precomputed facts, template cards, parallel calls, cache |

| Judging criterion (33% each) | What wins it                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Clinical approach and impact | Critical facts first, a "why shown" line per card, honest gaps, open questions, review controls, a grounded GP letter                        |
| Technical quality and AI     | The screen changes with role and task, every fact links to its passage, one validation boundary for every output, an agent that investigates |
| Execution and prototype      | The 5 situations, held-out situations and a role with no profile working live; metrics produced by the evaluation suite                      |

## Part A features

P0 is the scored core and must run end to end by H+7. P1 is the workflow and is done by the H+9 freeze. P2 starts only if someone is idle; dropping it costs nothing on the metrics.

| ID   | Feature                                                                        | Pri | Done when                                                                                                                 |
| ---- | ------------------------------------------------------------------------------ | --- | ------------------------------------------------------------------------------------------------------------------------- |
| P0.1 | Ingest documents into segments and facts with all ingest-time checks           | P0  | Every fact has a located quote, a semantic-support result and a negation flag; at least 95% of IBM's concepts are covered |
| P0.2 | Situation input: free text plus chips for the 5 test situations                | P0  | Role, task, procedure and as-of date parsed, including for roles with no profile                                          |
| P0.3 | Lens screen of template-rendered cards, streamed                               | P0  | All 15 expected answers visible without clicking, each with a source chip                                                 |
| P0.4 | Evidence panel                                                                 | P0  | A chip opens the exact sentence or table row, German with English translation                                             |
| P0.5 | Three availability states                                                      | P0  | "Not documented" only after the absence check; a failure shows "Couldn't check", never a gap                              |
| P0.6 | Contradictions and "needs clarification" lists                                 | P0  | C1–C5 shown with every passage; D1–D3 shown separately; 0 false alarms on the fixtures                                    |
| P0.7 | One claim validator for every output channel                                   | P0  | No composed claim is rendered or spoken before it passes                                                                  |
| P0.8 | Speed and cache                                                                | P0  | Complete screen < 5 s cold, < 1 s cached                                                                                  |
| P0.9 | Evaluation: promptfoo suite plus a Playwright visibility and timing check      | P0  | One command scores the 5 situations and the held-out set                                                                  |
| P1.1 | Role morph                                                                     | P1  | Cards that stay relevant glide to their new place when the role changes                                                   |
| P1.2 | Open questions panel                                                           | P1  | Lists the lens's contradictions, needs-clarification items and expected-but-missing facts                                 |
| P1.3 | Investigate with Ask Medlyn (text and push-to-talk)                            | P1  | Answers cite and highlight sources; every spoken sentence is validated first                                              |
| P1.4 | Review controls and ledger                                                     | P1  | Accept, correct, dismiss with reason, leave open; "Reset review layer" restores machine output                            |
| P1.5 | GP follow-up letter                                                            | P1  | Every factual sentence validated and cited; affected sentences flagged after review changes                               |
| P1.6 | Source highlight                                                               | P1  | Clicking a fact scrolls to and highlights its passage; the animated thread is optional                                    |
| P2.1 | Body map of left and right findings                                            | P2  | —                                                                                                                         |
| P2.2 | Time machine (as-of slider)                                                    | P2  | Uses the same evidence window rule                                                                                        |
| P2.3 | Self-hosted inference toggle (`gpt-oss` on the H100)                           | P2  | Measured latency reported, not just model fit                                                                             |
| P2.4 | Hands-free voice via fish.audio realtime speech recognition and a server relay | P2  | —                                                                                                                         |
| P2.5 | Further draft types, "Surprise me", a custom eval page                         | P2  | —                                                                                                                         |

## The cockpit and the workflow

One screen with a dark mission-control theme (light toggle), built for one complete workflow rather than a feature tour.

**Layout (1440 px wide)**

1. Top bar: Medlyn mark; patient chip "Anna Musterfrau · F · 57 y as of 15 Apr 2016" with the age linked to "geb. 15.03.1959"; the as-of date (read-only in P0); ⌘K.
2. Situation bar: one large input ("Who are you and what are you about to do?"), a push-to-talk orb, chips for the 5 test situations.
3. Lens canvas, left 60%: lens header, a critical band (allergies, blood thinners), then cards in a two-column grid.
4. Right panel, 40%, three tabs: Evidence (document with highlighted passage, DE / EN toggle, comparator), Open questions, Letter.
5. Ask Medlyn dock under the right panel (assistant-ui): transcript, live tool steps, push-to-talk.

**Card anatomy**

- Need title and a "why shown" line from the needs library.
- Fact lines rendered by templates, e.g. "Acetylsalicylic acid (Thrombo ASS) 100 mg, 1-0-0 · Discharge medication, 15 Apr 2016".
- An optional headline ("Yes — a similar episode in June 2015"), shown only after it passes validation.
- A source chip per fact line; hover previews the German passage with its translation.
- Badges derived from the card state dimensions: negated, planned, partial, contradicted, needs clarification, couldn't check, review state.
- Review controls on hover: accept, correct, dismiss, leave open.

**The workflow**

1. Enter a role and task by typing, a chip or voice.
2. Read the cards; critical facts and gaps are visible without clicking.
3. Open or compare passages in the evidence panel.
4. Pick an item in Open questions, e.g. "Carotid duplex recommended for about Aug 2015 — no record".
5. Investigate it with Ask Medlyn.
6. Review the item: accept, correct, dismiss with a reason, or leave open.
7. Generate the GP follow-up letter, then review or edit its sentences while their evidence stays attached.

**Visual identity and motion**

- Near-black navy background, surfaces one step lighter, hairline borders; the light theme uses the same tokens.
- One accent (electric teal) for interactive and verified; amber only for contradictions and needs-clarification; red only for critical; gray dashed for gaps.
- Geist Sans for text, Geist Mono with tabular numbers for doses, values and dates.
- Stream-in (titles first, then cards), role morph (Motion `layout`), source highlight, contradiction comparator with conflicting words lit ("rechts" vs "links").

## Definitions 1: evidence window and card states

**Evidence window.** The eligible documents are those whose document date is on or before the as-of date. The default as-of date is the latest document date, 15 Apr 2016, which is what present tense means in the situations.

- Every component receives the same eligible set: resolver, absence check, contradictions, agent tools and the letter.
- Knowledge time is the document date. An event after the as-of date is included when an eligible document states it, with its temporal status (the quadrantectomy on 16 May 2016 is "planned", stated on 15 Apr).
- A contradiction is shown only when all of its passages are eligible. Contradictions are computed once at ingest and filtered per window.
- A gap reads "Not documented as of 15 Apr 2016 · searched 8 of 8 eligible documents".

**Card state dimensions.** Each is stored separately; the display is derived from all of them and none overwrites another.

| Dimension       | Values                                                  | Example                                                                                        |
| --------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Availability    | documented, not documented, unavailable                 | Kidney function → not documented; a proxy timeout → unavailable ("Couldn't check", with retry) |
| Assertion       | present, negated, suspected, historical                 | "No atrial fibrillation on the Holter" → documented and negated, which is an answer, not a gap |
| Temporal status | planned, recommended, done, ongoing, given once, stated | Quadrantectomy with IORT on 16 May 2016 → planned                                              |
| Completeness    | complete, partial                                       | Receptor status documented but menopausal status missing → partial, listing what is missing    |
| Conflict        | none, contradicted, needs clarification                 | Carotid stenosis side → contradicted (C1)                                                      |
| Review          | none, accepted, corrected, dismissed, left open         | From the ledger; always none in evaluation                                                     |

Display: availability picks the card style (solid, dashed gap, or "Couldn't check"). Assertion and temporal status appear as chips on the fact line. Completeness adds a "partial" label. Conflict adds an amber badge linking to the comparator. Review adds its own badge.

**Medication display.** Schedules show morning-midday-evening when the night dose is 0, matching `expected.json`, and all four columns otherwise. A list is labelled with its source, e.g. "Discharge medication, 15 Apr 2016", never "current medication". One-off administrations, such as the emergency doctor's nitroglycerin spray in June 2015, have temporal status "given once". Changes between lists are shown as trends (candesartan 1-0-½ in Jun 2015 → 1-0-1 in Apr 2016), never as contradictions.

## Definitions 2: claims and validation

A claim is any statement that reaches a user: a card line, a headline, a spoken sentence, an insight or a letter sentence. Every channel passes claims through the same validator, so nothing reaches the screen or the speaker by a side route.

| Claim kind           | Example                                                                   | How it is validated                                                                                                       |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Template             | "Candesartan (Blopress) 16 mg, 1-0-1 · Discharge medication, 15 Apr 2016" | Inherits its facts' results, but only when the template displays checked fields faithfully and adds no meaning of its own |
| Composed             | "Yes — a similar episode in June 2015"                                    | Code check, then a semantic check against the cited facts and the original passages with context                          |
| Absence              | "Kidney function: not documented as of 15 Apr 2016"                       | The absence check over all eligible documents, not the cited facts                                                        |
| Clinician annotation | Text a clinician adds that the sources do not support                     | Never validated into a patient fact (Definitions 3)                                                                       |
| Boilerplate          | Letter greeting and closing from a fixed template                         | Exempt; contains no patient facts                                                                                         |

**Three layers, kept separate**

1. Location (code, at ingest): the quote is found in its segment, and every number, date, dose and side in the fact's fields occurs in that passage. Necessary, never sufficient.
2. Semantic support: at ingest, each fact against its passage; at query time, each composed claim against its cited facts and the original passages with context (the section header and neighbouring segments), so qualifications the extraction lost are still caught. Verdict: supported, partial or unsupported, plus the negation word-list flag.
3. Coverage: are the required facts present? Measured by evaluation, not at runtime.

A composed claim is not shown or spoken until the code check (numbers, dates, doses, sides and negation words must appear in the cited facts or passages) and the semantic check both pass. On failure, the card falls back to its template lines.

**Cache identity.** A validation result is reused only when all of these match: patient, corpus revision, evidence window (as-of date and eligible document ids), validator version (prompt, model and code), normalised claim text, cited fact ids with their content hashes, and cited segment ids. The same claim in a card, the letter and speech is checked once. A negative claim such as "follow-up not documented" can change without any cited fact changing, which is why corpus revision and evidence window are part of the identity. For the prototype, any corpus change bumps the revision and clears every cache; reviews are an overlay and never alter machine validation results.

## Definitions 3: review ledger and clinician authorship

Documents and machine-extracted facts are never edited. A review is an append-only ledger entry laid over the machine output. Two dimensions stay independent: document support (supported, partial, unsupported) and authorship or review (machine, accepted, corrected, clinician-asserted).

| Action                                             | Evidence graph                                                                                                                                                                                                                                     | Regenerated screens                                                                                                                                          | Letter                                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Accept                                             | Entry tied to the fact's id and content hash; support unchanged                                                                                                                                                                                    | "Confirmed" badge; drops to "needs re-review" if re-extraction changes the fact                                                                              | Badge only                                                                                                |
| Correct                                            | A proposed correction, linked to the original fact and passage, validated against that passage. Supported (an extraction error): it replaces the fact in display and the original stays in history. Unsupported: it becomes a clinician annotation | Supported corrections replace the fact; unsupported ones appear only in an annotation strip, never inside a fact card, never filling a "not documented" slot | Sentences built on the changed fact are flagged with a visible proposed edit, never silently rewritten    |
| Dismiss (contradictions, clarifications, insights) | Entry with a reason: change over time, measurement variation, different context, extraction error, not relevant to this lens, other. Passages untouched                                                                                            | Hidden from the lens, listed under "Dismissed"                                                                                                               | The affected uncertainty sentence is flagged with a proposed edit, not removed                            |
| Leave open                                         | "Acknowledged, unresolved" with who and when                                                                                                                                                                                                       | Stays in Open questions with that marker                                                                                                                     | Stated as an explicit uncertainty, e.g. "carotid side documented inconsistently; clarification requested" |

**Clinician-authored text (hackathon policy)**

- Confirming authorship records who wrote a statement; it never establishes support in the documents.
- Unsupported text never becomes a patient fact, never fills a "not documented" slot and is never counted as documented.
- The letter's factual body contains only validated claims. Unsupported clinician additions live in a separate, labelled block, "Clinician notes — not from the source documents", and are excluded from every metric.
- An edited factual sentence keeps its citations and is validated again; if it fails, the edit becomes a clinician annotation and the validated original remains in the body.

**Evaluation and the jury.** Metrics are computed with an empty review layer. Review entries belong to a session, the jury starts from a clean state and can try every control, and "Reset review layer" restores the machine output. Dismissal reasons and corrections are stored as candidate evaluation examples, never merged into fixtures automatically.

## Contradictions

A qualifying contradiction is two or more passages about the same event or measurement that cannot all be true, where the sameness is shown by the documents rather than assumed. Five cases qualify. Offsets refer to the normalised text (`<BR>` as newline, entities decoded).

| #   | Passages                                                                                                                                                                                                                                                                                                                                                                                          | Why they cannot all be true                                                                                                                               | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| C1  | 12340012 @3527 "Rechts findet sich in der A. carotis interna … zu etwa 60%" and @3716 "Auf der linken Seite … minimalste verkalkte Plaquebildungen ohne hämodynamische Wirksamkeit" vs 12340012 @3969–4033 "Maximal 60%ige Abgangsstenose der Arteria carotis interna links."; also 12340012 @194–219 "Carotissklerose li. (60%)" and 12340008 @430 "Links findet sich in der A. carotis interna" | Within one section of one letter, the findings put the 60% stenosis on the right and the overall assessment puts it on the left                           | High     |
| C2  | 12340012 @1697–1735 "Größe: 170 cm", "Gewicht: 78 kg", "BMI: 29.4"                                                                                                                                                                                                                                                                                                                                | 78 / 1.70² = 27.0; with ±0.5 cm and ±0.5 kg of rounding, 26.7–27.3                                                                                        | Medium   |
| C3  | 12340014 @635–671 "Größe: 171 cm", "Gewicht: 67 kg", "BMI: 29"                                                                                                                                                                                                                                                                                                                                    | 67 / 1.71² = 22.9; with rounding, 22.6–23.2                                                                                                               | Medium   |
| C4  | 12340016 @187–212 "Entnahmedatum: 11.04.2016" vs 12340018 @1054–1109 "Ultraschalluntersuchung der linken Brust vom 12.04.2016" and @1226–1290 "Es erfolgte die ultraschallgezielte Biopsie von 5 Stanzzylindern"                                                                                                                                                                                  | One biopsy, two collection dates. Sameness is shown: the letter's "Histologie vom 13.04.2016" (@1381) repeats the pathology summary and TNM word for word | Medium   |
| C5  | 12340018 @145–194 "Entlassen am 15/04/20156" vs @2348–2382 "am 15.04.2016 nach Hause entlassen"                                                                                                                                                                                                                                                                                                   | The same discharge is stated with two different dates; almost certainly a typo                                                                            | Low      |

**Needs clarification** is a separate list on screen, never counted as a contradiction. Possible explanations appear only as text on the item and never enter the timeline.

| #   | Passages                                                                                                                                                                    | Why it does not qualify                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1  | 12340018 @145 "Aufnahme am 10/04/2016" and 12340014 @1158–1189 "für den 10.04.2016 terminisiert" vs 12340018 @1637–1710 "wurde am 12.04.2016 … auf der Station aufgenommen" | Hospital vs ward admission is possible, not established. The timeline shows both stated dates with a discrepancy marker |
| D2  | 12340014 @1016–1054 "vergrößerte Lymphknoten rechts axillär" vs 12340018 @1340–1378 "axillär keine vergrößerten Lymphknoten" and 12340016 @925–941 "(T2 N0 M0 V0 G2)"       | Different examinations and dates, ultrasound side not stated. Shown to the surgeon as an open finding                   |
| D3  | 12340018 @128–142 "Fall: 20150610" vs 12340016 @105–119 "Fall: 20160410"                                                                                                    | Not established that the identifiers share a scope                                                                      |

**Dismissal fixtures** (the engine must not show these): weight 78 → 67 → 66 kg (change over time); height 170 vs 171 cm (measurement variation); admission blood pressure 145/90 vs 140/90 in 12340012 (measurement variation); candesartan 1-0-½ → 1-0-1 (change over time); allergy reaction listed with and without dizziness (omission); any difference from IBM's JSON (out of scope).

**Engine.** Candidates come from rules (side, same-event dates, BMI and age arithmetic, same-time values, restated dates) and an LLM sweep per entity and per document pair. Each candidate gets its own adjudication call with the full passages, the document dates and the taxonomy: qualifying contradiction, needs clarification, change over time, measurement variation, omission, different context. Only the first two reach the screen.

## Architecture

&#91;embedded content: Medlyn architecture v2 · ingest, store, live path, shared validator, outputs\]

Ingest checks every fact once per corpus revision. The live path only parses, selects fact ids, checks absences and renders templates. Every output — screen, agent and letter — passes the same validator, whose results are cached under the full identity; the agent and the letter compose claims that go through it too. Reviews are stored as an overlay and never change machine results.

```text
medlyn/
  apps/web/            Next.js 16: cockpit, /api/lens, /api/agent, /api/letter, /api/voice/*
  packages/engine/
    db/                Drizzle schema, Neon client
    llm/               proxy client, model roles, smoke test
    ingest/            normalise, segment, medication parser, extract, locate, semantic check, negation list
    findings/          rules, sweep, adjudication, fixtures
    lens/              parse, plan, select, absence check, templates, stream; needs/catalog.ts, needs/profiles.ts
    claims/            claim types, validator, cache identity
    review/            ledger and overlay
    agent/             tools, system prompt
    letter/            sections and templates
    contracts.ts       Zod schemas shared with the UI
  eval/                promptfooconfig.yaml, assertions, playwright/
  ml/                  Part C only: Python generator, label checks, training
  data/                gitignored, never committed
```

Commands: `pnpm smoke` (proxy smoke test), `pnpm ingest`, `pnpm warm`, `pnpm eval`. The latency budget sits under the query pipeline.

## Data model and contracts

Neon Postgres with Drizzle (`packages/engine/db/schema.ts`). No vector search in P0: with 8 short documents, the resolver takes every fact of the relevant kinds. Every table carries `patient_id`.

| Table              | Key columns                                                                                                                                                                                             | Notes                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `corpus_revisions` | id, patient_id, documents_hash, created_at                                                                                                                                                              | Bumped on any document change; part of every cache identity     |
| `documents`        | id, patient_id, revision_id, title, title_en, doc_type, doc_date, department, raw_text, norm_text, offset_map                                                                                           | `doc_date` drives the evidence window                           |
| `segments`         | id, document_id, kind (sentence, table_row, list_item, heading), section, start, end, text, text_en                                                                                                     | The unit every link points at                                   |
| `facts`            | id, segment_id, kind, label_en, attrs jsonb, assertion, temporal_status, event_date, date_precision, quote, start, end, entity_id, location_ok, support, negation_flag, content_hash, validator_version | Cannot exist without `location_ok`                              |
| `entities`         | id, patient_id, kind, canonical_en, event_key, codes jsonb (ICD-10, ATC)                                                                                                                                | Groups mentions of one thing; `event_key` for same-event checks |
| `findings`         | id, patient_id, type (contradiction, needs_clarification, dismissed_candidate), title, explanation, severity, computation, hypothesis_text                                                              | Contradictions and clarification items                          |
| `finding_passages` | finding_id, segment_id, fact_id, claim_en                                                                                                                                                               | Two or more per finding                                         |
| `validations`      | cache_key, verdict, details jsonb, created_at                                                                                                                                                           | Keyed by the full cache identity (Definitions 2)                |
| `reviews`          | id, session_id, target_type, target_id, target_hash, action, reason, proposed_text, support_result, author, created_at                                                                                  | Append-only; never read by evaluation                           |
| `lens_cache`       | key (patient, revision, window, situation hash, engine version), screen jsonb, timings                                                                                                                  | Pre-warmed for the 5 situations                                 |
| `letters`          | id, session_id, lens_key, claims jsonb, annotations jsonb, created_at                                                                                                                                   | Claims carry their validation keys                              |

The screen contract lives in `packages/engine/contracts.ts` as Zod schemas; the UI builds against a mock of it from H+0.5.

```ts
type Claim = {
  id: string;
  kind: "template" | "composed" | "absence" | "annotation" | "boilerplate";
  text: string;
  factIds: string[];
  segmentIds: string[];
  author: "machine" | "clinician";
  validation: {
    key: string;
    support: "supported" | "partial" | "unsupported" | "exempt";
    negationFlag?: boolean;
  };
};

type Card = {
  id: string;
  needId: string;
  title: string;
  why: string;
  cardType: "facts" | "medication_list" | "trend" | "gap"; // fixed catalog, rendered by registered components
  availability: "documented" | "not_documented" | "unavailable";
  completeness: "complete" | "partial";
  missing?: string[];
  conflict: "none" | "contradicted" | "needs_clarification";
  findingIds: string[];
  headline?: Claim; // composed, shown only once validated
  lines: (Claim & {
    assertion: string;
    temporalStatus: string;
    asOf?: string;
  })[];
  searched?: { eligible: number; total: number; asOf: string };
  review?: { action: string; at: string }; // overlay; absent in evaluation
};

type Screen = {
  situation: {
    role: string;
    task: string;
    procedure?: string;
    procedureDate?: string;
    asOf: string;
    tier: 1 | 2 | 3;
  };
  window: {
    asOf: string;
    eligibleDocumentIds: string[];
    corpusRevision: string;
  };
  critical: string[];
  sections: { id: string; title: string; cards: Card[] }[];
  findings: Finding[];
  openQuestions: string[];
  timings: { planMs: number; totalMs: number; cached: boolean };
};
```

## Ingestion pipeline

`pnpm ingest --data <path>` runs once per patient and writes everything to Neon. Target under 3 minutes for 8 documents, provisional until the smoke test.

1. Normalise: `<BR>` to newline, decode entities, keep an offset map to the raw text.
2. Segment (code): lines, section headers (Diagnosen, Allergien, Anamnese, Erhobene Befunde, Labor, Therapie und Verlauf, Entlassungsmedikation, Weiteres Procedere, Verlauf, Vitalparameter, Befunde, Zusammenfassung, Gesamtbeurteilung, Mikroskopischer Befund, Immunhistologisches Profil, Diagnose) and sentences, with an abbreviation list so "St.p.", "Z.n.", "Vd.a.", "li.", "re.", "bds.", "Pat.", "Dr.", "A.", "Diab. Mell.", "03. April" and "36.6°C" do not split.
3. Parse medication tables (code): rows between "Entlassungsmedikation:" and "Mit freundlichen Grüßen" become table-row segments and medication facts (brand, strength, route, four schedule columns, unit), including the irregular rows "1 0 1/2 0", "ST 1x/Woche 1 Tabl." and "5mcg 0,5 s.c.". Display follows the medication rule in Definitions 1.
4. Extract (LLM, `MODEL_REASONING`, structured output, one call per section): atomic facts with a verbatim German quote, kind, English label, fields, assertion, temporal status, event date with precision. The document date is attached by code. Recommendations get a due date from the document date ("in 2 Monaten" in a letter of 28 Jun 2015 → about Aug 2015).
5. Locate (code, layer 1): exact, then whitespace- and case-normalised, then fuzzy match (similarity ≥ 0.9) within the segment; every number, date, dose and side in the fields must occur in the passage. Failures are dropped and logged.
6. Recall pass (LLM): IBM's matched texts for the document as hints; new facts go through step 5.
7. Semantic check (LLM, `MODEL_FAST`, layer 2): each fact against its passage with context → supported, partial (corrected) or unsupported (dropped). Independently, the German negation word list (`cotik-de`, ported from pynegex; ü→ue and ß→ss before matching) flags facts whose passage contains a negation trigger near the concept while the fact says "present". A flag sends the fact back to the semantic check; it never decides on its own.
8. Normalise: brand to generic and ATC (curated map for this patient — Thrombo ASS → acetylsalicylic acid, Glucophage → metformin, Zocor → simvastatin, Blopress → candesartan, Oleovit D3 → colecalciferol, Alendronat → alendronic acid, Actos → pioglitazone, Byetta → exenatide, Nitro-Spray → glyceryl trinitrate — with an LLM fallback), diagnoses to English and ICD-10, dates to ISO with precision.
9. Cluster entities and assign event keys (LLM, one call per fact kind).
10. Translate every segment to English (`text_en`).
11. Findings: contradiction candidates, adjudication, storage (see Contradictions).
12. Bump the corpus revision, clear all caches, pre-warm the lens cache for the 5 situations.

## Query pipeline and needs library

A situation becomes a screen in six steps. Only parse, select and the absence check call a model, all with `MODEL_FAST`.

1. Parse (LLM, structured): role, task, setting, procedure and date, as-of date, specific concerns ("iodinated contrast", "dizziness and blurred vision, left eye"). Fix the evidence window.
2. Plan (code; LLM only without a profile): choose a profile or compose sections from the need catalog, add needs for each concern, always add the critical needs. Record the generalisation tier.
3. Select (LLM, one call per section, in parallel): the model receives every eligible fact of the relevant kinds (no top-k retrieval) and returns, per need, the selected fact ids, completeness and an optional headline. It writes no card text.
4. Absence check, for every need with nothing selected: (a) a German and English synonym search over eligible segments (kidney function → Kreatinin, GFR, eGFR, Niere, Nierenfunktion, Harnstoff), and (b) one LLM pass over the full text of the eligible documents asking whether the information appears anywhere. A hit re-runs selection with that passage; both empty → not documented; an error or timeout → unavailable.
5. Render and validate: templates turn selected facts into card lines (inheriting validation); the headline goes through the code and semantic checks; findings inside the window are attached.
6. Stream each section as it finishes and store the screen in the lens cache.

| Step                                       | Budget (provisional)     |
| ------------------------------------------ | ------------------------ |
| Parse and plan                             | \~1 s                    |
| First section visible                      | ≤ 1.5 s                  |
| Select, all sections in parallel           | \~2.5 s                  |
| Absence checks, in parallel with rendering | \~1.5 s                  |
| Complete screen                            | < 5 s cold, < 1 s cached |

**Generalisation tiers** are reported separately, never mixed.

| Tier | Meaning                                                             | Example                                                                                  |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | New wording of a configured situation                               | "Anaesthesia pre-assessment for her breast surgery next month"                           |
| 2    | New combination of configured needs and profiles                    | "Radiologist before a contrast CT of the neck vessels"                                   |
| 3    | A role with no profile; the planner composes needs from the catalog | "Dentist before a tooth extraction" (should surface alendronate, aspirin, diabetes, SLE) |

The 5 challenge situations are the regression set. Someone who is not tuning prompts writes 20 held-out situations across all three tiers now, before tuning starts, and nobody looks at their results until H+7.

**Profiles for the five situations**

| Profile                         | Sections and needs, in screen order                                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anaesthesia, pre-op             | Procedure and date · Allergies (critical) · Antithrombotics (critical) · Cardiac function: EF, valves, ECG, Holter · Blood pressure and drugs · Airway and aspiration: sleep apnoea, reflux grade, hiatal hernia, BMI · Diabetes drugs incl. GLP-1 agonist, HbA1c · Kidney function · Carotid stenosis · Other: SLE, osteoporosis, previous cholecystectomy · Labs |
| Surgery after tumour board      | Diagnosis and side · Histology, grade, TNM · Receptors and Ki-67 · Tumour size and location · Armpit lymph nodes (D2 open finding) · BI-RADS · Tumour board recommendation and date · Surgical risks: antithrombotics, diabetes, SLE, allergies · Family history                                                                                                   |
| GP diabetes review              | Glucose-lowering drugs · Latest HbA1c and date · Weight trend (calculated) · BMI (C2, C3) · Blood pressure and drugs · Lipid therapy · Kidney function · Eye findings and follow-up · Cardiovascular disease · Urine albumin, lipids, foot exam                                                                                                                    |
| Emergency, dizziness and vision | Prior similar episodes and cause · Carotid stenosis and side (C1) · Antithrombotics · Antihypertensives · Before contrast: allergy, metformin, kidney function · Holter rhythm · Diabetes drugs · Active cancer and planned surgery · Open follow-ups                                                                                                              |
| Open follow-ups from a stay     | Each discharge recommendation with due date and completion evidence (done, not documented) · Context per item (carotid side) · Later documents searched                                                                                                                                                                                                            |

Configured tier-2 profiles: medical oncologist, radiation oncologist (IORT), radiologist before contrast, cardiologist, ophthalmologist, ward nurse, pharmacist, dietitian, psycho-oncology. Each takes about 15 minutes to write.

## Ask Medlyn

Ask Medlyn investigates one open question at a time and knows only what the fact graph and the eligible documents contain. Every sentence it shows or speaks is a claim and passes the shared validator first.

**Dock.** assistant-ui components with the AI SDK v7 adapter, pinned together (`ai` 7.x, `@assistant-ui/react-ai-sdk` 1.4.x). The cockpit canvas stays custom; only the dock uses assistant-ui.

**Investigate flow.** "Investigate" on an open question starts the agent with that item, the lens and the evidence window. It runs at most 6 tool steps, shows each step live, and ends with a short cited answer plus one proposed next action (for example "Add to the GP letter" or "Leave open").

| Tool                             | What it does                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `search_facts(query, kinds?)`    | Facts within the window, with segment ids                                              |
| `get_passage(segmentId)`         | The German passage, its translation and neighbouring segments                          |
| `check_documented(concept)`      | The absence check: documented, not documented (with documents searched) or unavailable |
| `list_findings(topic?)`          | Contradictions and needs-clarification items in the window                             |
| `timeline(entityOrKind)`         | Dated facts for an entity, e.g. weight or carotid findings                             |
| `calculate(expression, factIds)` | Arithmetic on cited values, returning the formula                                      |
| `show_source(segmentId)`         | UI: opens the evidence panel at the passage                                            |
| `add_to_letter(claimIds)`        | UI: proposes claims for the GP letter                                                  |

UI tools are client-side tool calls, so the agent visibly drives the cockpit.

**Push-to-talk voice.** Hold Space or the orb; the browser records; the server transcribes with `MODEL_STT` on the proxy; the agent streams its answer; each sentence is validated and only then sent to fish.audio streaming text-to-speech (`latency: balanced`, one chosen voice). First audio about 2.5 s, provisional. If fish.audio fails, the browser's speech synthesis takes over; the transcript always shows as text. Hands-free voice is P2 and needs a server relay, because fish.audio's realtime speech recognition must be called from a server.

**Guardrails.** Patient facts come only from tool results and are cited. General medical knowledge appears only under a "General knowledge" label. Nothing found means "not documented" plus what was searched. Spoken answers stay at two sentences.

## GP follow-up letter

The one draft is a follow-up letter to the GP, written as of 15 Apr 2016. It exercises the whole workflow: recommendations, the search for completion, uncertainty, source comparison and review.

| Section                           | Content                                                                                                                                                                                                                      | Claim kind           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Header and greeting               | Fixed template                                                                                                                                                                                                               | Boilerplate          |
| Reason                            | Follow-up of the recommendations from the June 2015 stay (stay dates as stated in 12340012)                                                                                                                                  | Template             |
| Recommendations at discharge      | Carotid duplex in 2 months ("Nächste geplanter Duplexsonographie der Karotisgefäße in 2 Monaten"); regular eye check-ups (12340011, 12340012); regular blood pressure checks with medication adjustment by the GP (12340012) | Template             |
| Completion status                 | For each: "no record in the 8 eligible documents" from the absence check; the candesartan schedule change between the two letters shown as a change over time                                                                | Absence and template |
| Clarification requested           | Carotid stenosis side documented inconsistently (C1), both passages cited                                                                                                                                                    | Template             |
| Since then                        | Invasive ductal carcinoma of the left breast; tumour board recommendation; quadrantectomy with IORT planned for 16 May 2016                                                                                                  | Template             |
| Discharge medication, 15 Apr 2016 | Table from the medication facts                                                                                                                                                                                              | Template             |
| Clinician notes                   | Any unsupported clinician additions, labelled "not from the source documents"                                                                                                                                                | Annotation           |
| Closing                           | Fixed template                                                                                                                                                                                                               | Boilerplate          |

Behaviour: every factual sentence carries at least one citation and passes validation before it appears. Review changes (a correction, a dismissal, a changed source) flag the affected sentence with a visible proposed edit; nothing is rewritten silently. Edits follow the clinician-authorship policy in Definitions 3. The letter prints to PDF with citations as footnotes.

Done when: generated in under 15 s; every factual sentence cited and supported; C1 stated as a clarification request; no unsupported text in the factual body.

## Evaluation

`pnpm eval` runs a promptfoo suite against the engine plus a short Playwright script, always with an empty review layer. Its output is the metrics submission after a human check.

| Check                    | How                                                                                                                                                                                                                                       | Pass                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Correct answers          | promptfoo calls the lens API per situation; an LLM rubric (`MODEL_REASONING`) compares the visible cards with the expected answer and names the card; a citation to one of the expected documents is required except for "not documented" | 15/15 on the regression set                          |
| Visible without clicking | Playwright loads each screen and checks the answering card is rendered and not collapsed                                                                                                                                                  | All 15                                               |
| Load time                | Playwright: submit to last section, cold and warm                                                                                                                                                                                         | Slowest < 5 s cold                                   |
| Traceability             | Every fact on every screen passes the location layer                                                                                                                                                                                      | 100%                                                 |
| Unsupported claims       | Every composed claim re-checked against its facts and passages                                                                                                                                                                            | 0                                                    |
| Availability             | Gaps match the expected "not documented" answers; no unavailable states in a healthy run                                                                                                                                                  | All match                                            |
| Contradictions           | Findings compared with C1–C5, D1–D3 and the dismissal fixtures                                                                                                                                                                            | C1–C5 shown, D1–D3 in their own list, 0 false alarms |
| Held-out situations      | The 20 held-out situations, scored by tier for relevance and grounding                                                                                                                                                                    | Reported per tier                                    |
| GP letter                | Claim precision and recall with prompts borrowed from TBFact (unsupported additions vs omissions) against a hand-written reference list of what the letter must state                                                                     | Reported                                             |

The judge is a model. Before submission a person checks all 15 answers on the real screens, and `METRICS.md` reports the human-checked numbers.

## Part C: synthetic data and the verifier

This is optional research, capped at one person and 3 hours, starting only after the H+7 checkpoint passes. Inside the event it can produce a pilot: generator v0, 20–50 patients and a dataset spec. Training most likely happens afterwards.

**Generator stages**

1. Structured patient history with stable events and dates (Synthea optional as a backbone).
2. Documentation plan: what each document states, paraphrases, omits or negates.
3. German documents rendered from the plan. Structured parts (medication tables, vital signs) are rendered by code, so their spans are exact; prose comes from the LLM. Base: the NHS England synthetic clinical notes pipeline (journeys, stage notes, typos and abbreviations), with its two adapter functions pointed at our proxy and German templates added.
4. Controlled mutations recorded in a ledger: wrong side, dose, date or assertion status.
5. Labels describing the final documents: supported claims, evidence spans, contradictions and gaps. A value the patient "has" but no document records is labelled "not documented".

| Label tier | Source                                                                                                                                                       | Used for                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Intended   | Documentation plan and mutation ledger                                                                                                                       | Starting point                                              |
| Candidate  | LangExtract or another extractor on a model different from the generator                                                                                     | Finding spans and unplanned content; never truth on its own |
| Verified   | Intended labels confirmed on the final text: code checks for planned values and mutations, plus an independent check that each planned statement was written | Training and evaluation                                     |
| Gold       | Human-reviewed subset, about 50 documents                                                                                                                    | Measuring label noise                                       |

If a planned fact never appears in the text, its label becomes "not documented" by rule, not by extractor. Medlyn's own extractor never labels the data it is evaluated on.

**Leakage.** Split by patient and generation family before any augmentation. Hold out whole document styles, scenario types and mutation types to measure transfer.

**First specialised task: claim verification** (supported, unsupported, contradicted, with assertion and timing as sub-labels). It protects every channel through the shared boundary, its labels come cheaply and reliably from mutations, it is narrow enough for a small model, and voice needs it fast. Assertion and timing extraction come second; relevance ranking last, since its labels are subjective. Training uses TRL and PEFT (LoRA on a small open model). Compare against the GPT judge and a rules-only baseline on held-out families and the gold set, reporting quality, coverage, latency and cost together.

**Self-hosted inference.** `gpt-oss-120b` with vLLM on the H100 is described as self-hosted inference, not on-prem: storage and voice remain cloud services. Only measured setup time and latency are reported.

## Dependencies

Part A adds two new libraries to the planned stack (Next.js 16, Tailwind, shadcn/ui, Motion, Drizzle, Neon, AI SDK v7). Every integration estimate is provisional until the proxy smoke test and the thin slice have run.

| Repository                                                                                                                                                                                  | Use              | Exact piece                                                                                           | Licence                 | Estimate                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| [vercel/ai](https://github.com/vercel/ai)                                                                                                                                                   | Adopt            | Structured output, tool calls, streaming (v7)                                                         | Apache-2.0              | Planned                 |
| [assistant-ui](https://github.com/assistant-ui/assistant-ui)                                                                                                                                | Adopt, dock only | Thread, composer, tool UIs, AI SDK adapter (`@assistant-ui/react-ai-sdk` 1.4.x requires `ai` ^7)      | MIT                     | \~1 h                   |
| [promptfoo](https://github.com/promptfoo/promptfoo)                                                                                                                                         | Adopt            | Test runner, JavaScript assertions, results viewer                                                    | MIT                     | \~1 h                   |
| [healthcare-ai-model-evaluator](https://github.com/microsoft/healthcare-ai-model-evaluator)                                                                                                 | Borrow           | The two TBFact prompts and scoring in `functions/medbench/evaluators/tbfact/`                         | MIT                     | \~1 h to port           |
| [pynegex](https://github.com/DFKI-NLP/pynegex)                                                                                                                                              | Borrow           | German negation list `triggersets/cotik-de.txt` (512 entries), ported to TypeScript, with attribution | Python-style permissive | \~1 h                   |
| [json-render](https://github.com/vercel-labs/json-render)                                                                                                                                   | Idea only        | A fixed card-type catalog mapped to registered components                                             | Apache-2.0              | —                       |
| [synthetic_clinical_notes](https://github.com/nhsengland/synthetic_clinical_notes)                                                                                                          | Part C base      | Journey and note pipeline; adapters `call_llm` and `read_write_data` in `src/processing.py`           | MIT (docs OGL)          | 2–3 h to run in English |
| [langextract](https://github.com/google/langextract)                                                                                                                                        | Part C           | Candidate annotator; OpenAI provider accepts a configurable endpoint, untested against our proxy      | Apache-2.0              | —                       |
| [synthea](https://github.com/synthetichealth/synthea)                                                                                                                                       | Part C, optional | Structured patient histories (US-centric)                                                             | Apache-2.0              | Half a day              |
| [TRL](https://github.com/huggingface/trl), [PEFT](https://github.com/huggingface/peft)                                                                                                      | Part C           | Verifier fine-tuning                                                                                  | Apache-2.0              | —                       |
| [LiveKit agents-js](https://github.com/livekit/agents-js), [Docling](https://github.com/docling-project/docling), [Open Medical Scribe](https://github.com/BirgerMoell/open-medical-scribe) | Part B           | Hands-free voice; PDF and scan ingestion; transcript review reference                                 | Apache-2.0; MIT; MIT    | —                       |
| [medspaCy](https://github.com/medspacy/medspacy), [Chatty Notes](https://github.com/synthetichealth/chatty-notes)                                                                           | Not used         | No German rules; a 2023 script on the pre-1.0 OpenAI API                                              | MIT; Apache-2.0         | —                       |

## 12-hour build plan

&#91;embedded content: 12-hour build plan v2 · 3 lanes, optional lane, 6 checkpoints\]

All durations are provisional until the smoke test and the thin slice have run. The checkpoints carry the plan:

- H+0 to H+0.5: proxy smoke test (chat, JSON-schema output, tool calls, streaming, transcription, latency per model), Neon project, screen contract and mock frozen. The `gpt-oss` download starts in the background.
- H+2 go/no-go: situation 1 renders one template card with one citation through the real pipeline. If it does not, the agent becomes text-only and person C joins the engine.
- H+5 integration: the real engine replaces the mock for all lenses.
- H+7 end to end: all 5 situations from the real engine, first eval run, held-out results opened. Anything below 15/15 now outranks every P1 item. Part C may start only from here.
- H+9 freeze: fixes only; unmerged work is dropped.
- With 2 people instead of 3: the agent stays text-only, and the letter moves to the UI lane after H+7.

## Demo script and submission

The video has 120 seconds and must say what works and what does not. Record on the frozen Neon `demo` branch with an empty review layer, warm cache, plus one cold run on camera.

| Time      | On screen                                                                                                                                                                                         | Voice-over                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 0:00–0:10 | Empty cockpit                                                                                                                                                                                     | "A clinician needs the facts for the job in front of them, and proof for each one."    |
| 0:10–0:30 | Spoken: "I'm the anaesthetist, pre-op check before her quadrantectomy with IORT on 16 May." Cards stream in; click aspirin, the medication row lights up                                          | "Every fact links to its sentence or table row, in German with a translation."         |
| 0:30–0:45 | Emergency chip: cards morph; carotid card with the C1 badge and comparator; contrast card shows allergy, metformin, and kidney function not documented, 8 of 8 searched                           | "Same patient, different job. Contradictions where they matter, gaps stated honestly." |
| 0:45–1:10 | Follow-up situation: Open questions → Investigate "Was the carotid ultrasound done?" → no record → Leave open → GP letter appears with citations; an unsupported edit turns into a clinician note | "Investigate, review, draft — and the letter stays grounded in the record."            |
| 1:10–1:25 | A tier-3 role typed live: "Dentist before a tooth extraction"                                                                                                                                     | "Roles we never configured still work."                                                |
| 1:25–1:45 | promptfoo results: 15/15 regression, held-out by tier, C1–C5 with 0 false alarms, latency                                                                                                         | "Measured automatically, checked by hand."                                             |
| 1:45–2:00 | Plain slide                                                                                                                                                                                       | What does not work yet, said plainly                                                   |

- [ ] Video ≤ 2:00, including what does not work
- [ ] Public repo without `data/`; a pre-commit check proves it
- [ ] README: architecture diagram, components and how they work together, models and services (GPT models via proxy, fish.audio, Neon, vLLM if used), dependency licences
- [ ] Run instructions: `pnpm i`, `.env` from `.env.example`, `pnpm db:push`, `pnpm ingest --data <path>`, `pnpm dev`
- [ ] `METRICS.md`: human-checked results on the 5 situations with an empty review layer, held-out results by tier
- [ ] Hosted demo behind a password (optional)

## Risks and fallbacks

| Risk                                                        | Likelihood                   | Fallback                                                                                                             |
| ----------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The proxy lacks JSON-schema output or tool calls            | Unknown until the smoke test | JSON mode with Zod repair and one retry; tools emulated with structured output                                       |
| A needed fact is missed, producing a wrong "not documented" | Medium                       | Recall pass, deterministic medication parser, full-text absence check, eval loop from H+5                            |
| The absence check itself times out                          | Medium                       | "Couldn't check" with retry, never a gap; pre-warmed cache for the 5 situations                                      |
| A false alarm in contradictions                             | Medium                       | Qualifying definition, adjudication, dismissal fixtures in the eval                                                  |
| Validation adds latency to cards or speech                  | Medium                       | Template cards need no query-time check; headlines appear late rather than unverified; cache identity reuses results |
| Proxy latency pushes screens past 10 s                      | Medium                       | Parallel section calls, smaller model at query time, cache                                                           |
| Voice unreliable on demo day                                | Medium                       | Text input always works; voice recorded in a good take; browser speech fallback                                      |
| UI and engine drift apart                                   | Medium                       | Contract and mock frozen at H+0.5; thin slice by H+2; integration at H+5                                             |
| IBM data leaks into the public repo                         | Low                          | gitignore, pre-commit check for `data/` and document ids, no database dumps committed                                |
| Parts B or C consume Part A time                            | High                         | Budget rule: Part C starts only after H+7 passes, capped; Part B has zero build hours; freeze at H+9 is absolute     |

## Open questions

- [ ] Team size and owners for the engine, UI and agent lanes (the plan assumes 3).
- [ ] Proxy capabilities and latency per model — answered by the H+0 smoke test.
- [ ] Is the H100 free now and reachable from the app (needed only for P2 and Part C)?
- [ ] Which fish.audio voice: a stock voice or a cloned one?
- [ ] Who writes the 20 held-out situations, and are they written before tuning starts?

## Sources

- Challenge repository: `README.md`, `data/README.md`, `cases/situations.md`, `cases/expected.json` (Track 1, IBM Austria)
- [FactsR technical report, Corti (arXiv 2505.10360)](https://arxiv.org/html/2505.10360v2)
- [Introducing LangExtract, Google](https://developers.googleblog.com/en/introducing-langextract-a-gemini-powered-information-extraction-library/)
- [Abridge on removing hallucinations, HIT Consultant](https://hitconsultant.net/2025/08/21/abridge-outlines-approach-to-eliminating-ai-hallucinations-in-clinical-notes/)
- [Healthcare Agent Orchestrator and TBFact (arXiv 2509.06602)](https://arxiv.org/pdf/2509.06602)
- [LLM inconsistency detection in discharge summaries (arXiv 2607.22954)](https://papers.cool/arxiv/2607.22954)
- [Longitudinal synthetic clinical notes pipeline, NHS England (arXiv 2606.26879)](https://arxiv.org/abs/2606.26879)
- [fish.audio text-to-speech WebSocket docs](https://docs.fish.audio/text-to-speech/text-to-speech-ws) and [realtime speech recognition docs](https://docs.fish.audio/api-reference/endpoint/websocket/asr-realtime.md)
- Repositories inspected for the dependency table: see the links in Dependencies
