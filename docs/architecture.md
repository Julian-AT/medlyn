# Architecture

Medlyn's Part A build covers one synthetic patient: situation-specific cards, source inspection, investigation, review and a GP follow-up letter. Multi-patient worklists, FHIR, PDF/scan ingestion and production deployment belong to the product direction and are outside this build. Synthetic-data research and verifier training are separate; no self-hosted inference service is integrated.

This guide describes code present in the shared tree, not a verified deployment. The [README](../README.md) contains the architecture diagram, setup commands, service configuration and direct dependency licences. End-to-end claims and submission metrics require separate live validation.

## Ingestion and evidence storage

The loader reads local patient metadata, the document manifest and document JSON at runtime. A corpus revision is derived from the input content. Normalisation decodes entities and line breaks while preserving a map back to raw offsets. Segmentation produces sentences, headings, list items and medication table rows with offsets into normalised text.

Medication tables use a deterministic parser. Model extraction and recall recover structured facts from the source documents; pre-extracted challenge concepts serve as coverage hints, not authoritative evidence. Facts must pass quote location and sensitive-value checks. Semantic validation and German negation rules retain support, assertion and temporal distinctions. Translation supplies English source views alongside German passages. Entity clustering links related facts.

Finding rules cover laterality, event dates and arithmetic consistency; a model sweep proposes additional candidates. Adjudication distinguishes contradictions, requests for clarification and dismissed candidates. Each retained finding carries at least two located passages. A later medication list or small measurement change is not by itself a contradiction.

Drizzle accesses Neon over the serverless HTTP driver. Storage separates:

| Records | Purpose |
| --- | --- |
| Corpus revisions, documents and segments | Input identity, original and normalised text, offset mapping, source dates and English translations. |
| Entities and facts | Structured evidence, provenance, content hashes, validation version and support state. |
| Findings and finding passages | Adjudicated outcomes and every supporting passage; dismissed candidates are retained off screen. |
| Validations and lens cache | Claim verdicts and reusable machine screens. |
| Reviews and letters | Append-only session review decisions, saved letter claims and clinician annotations. |

Document IDs come from filenames. Segment IDs combine document ID and ordinal. Fact IDs derive from content hashes. Ingestion owns evidence writes; live paths read that evidence and write only their validation, screen, review or letter records.

## One window for every live path

The store creates an evidence window containing the as-of date, eligible document IDs and corpus revision. Eligibility means the document date is on or before the as-of date; the default is the latest source document date. Event dates do not independently make a future document eligible.

The lens, absence check, agent and letter reuse that set. A finding is eligible only when every passage belongs to an eligible document. Search counts distinguish eligible documents from the full corpus. Availability, assertion, temporal status, completeness, conflict and review remain separate contract fields.

## Live lens and screen contract

A situation chip maps directly to a profile. Free text is parsed by the fast model. Profiles group a fixed catalog of needs into sections; an unfamiliar role invokes a model planner that may choose only catalog IDs. Code adds critical and concern-specific needs.

Each section's selection call receives eligible facts of relevant kinds rather than a top-k vector retrieval. Calls run in parallel with bounded model concurrency. Responses contain fact IDs, completeness and an optional headline. The engine rejects selections outside the need's eligible candidates. Templates write the card lines and preserve source-list dates, certainty and whether an event was planned, recommended or performed.

When nothing is selected, absence checking searches German/English synonyms and sends the full normalised eligible documents to the fast model. Both searches must complete; an empty result permits a validated absence claim. A hit can trigger another selection pass. Missing inputs, invalid returned IDs, model errors and timeouts produce `unavailable`, never `not_documented`.

The lens endpoint emits newline-delimited JSON using the shared Zod contract: `situation` with section titles, completed `section` events, optional validated `headline` events, `findings`, then `done` with timings. Errors use an explicit event. Source routes return the cited segment, neighbouring context or the document for the evidence panel.

The current web route also supports an explicit mock mode and automatically replays a labelled mock if live setup fails before streaming. It exposes the mode in `X-Medlyn-Mode`; live evaluation refuses mock fallback. A populated cockpit alone therefore does not demonstrate live ingestion or retrieval.

The budget is first card below 1.5 seconds, complete cold screen below 5 seconds and cache replay below 1 second. These are provisional targets. The measured proxy floor of roughly 1.25 seconds per call makes serial parse-and-select expensive; chips bypass parsing and the live stream exposes section titles before cards. Unknown roles can add a planning call. Full absence checks can exceed the target and must still report failures honestly.

## Shared claim boundary

Screen lines, optional headlines, agent statements, speech and letter sentences use the same claim validator. A claim identifies its text, kind, author, fact IDs, segment IDs and validation result.

- Template claims must match registered renderings of their cited facts and inherit evidence support.
- Composed claims must cite eligible evidence, pass sensitive-token checks and receive a semantic support verdict against source passages and context.
- Absence claims need a matching completed full-window search result, including topic, date and document count.
- Fixed nonclinical boilerplate is explicitly exempt. Clinician annotations remain separate from verified patient facts.

Unsupported output is withheld. A rejected headline leaves the checked template lines; the agent buffers generated text before releasing validated claims. Letter edits are revalidated, and unsupported edits become clinician annotations rather than replacement machine facts.

Cache identity includes patient, corpus revision, the full evidence window, validator version, normalised text, cited fact IDs and content hashes, and segment IDs. Lens caching additionally includes engine identity and the parsed situation. Screens with unavailable cards are not cached. Reviews are applied after machine output retrieval.

## Investigation, speech and letters

Ask Medlyn uses AI SDK v7 through the OpenAI-compatible proxy, with assistant-ui in the browser. Its tools search facts, inspect passages, check documentation, list findings, build timelines and calculate from cited values. Source-display and letter actions refer to evidence or validated claims. Tool evidence is scoped to the same window; final answer claims pass the shared gate before entering the message stream.

The server signs validated speech text with a receipt, which the TTS route checks before forwarding text to fish.audio. Browser speech synthesis is a fallback for the same validated text. Browser speech recognition is feature-detected push-to-talk; its transcript enters the text path. No proxy transcription model is used.

GP letters are assembled from evidence-backed sections and checked sentence by sentence. Follow-up completion uses the same absence mechanism. Saved letters retain claim and source identities; subsequent corrections, dismissed findings and changed sources flag affected sentences for review. Clinician-authored notes remain visibly distinct.

## Review overlay

Accept, correct, dismiss and leave-open actions append ledger entries with author, session, target ID and target hash. Corrections are validated; unsupported proposals remain annotations. The overlay changes presentation without rewriting documents, facts or machine verdicts. A reset marker clears the effective session overlay while preserving the ledger. Changed target hashes require review again.

## Evaluation and submission boundary

The evaluation workspace loads the five challenge situations and expected answers at runtime. promptfoo checks visible answers, relevance and grounding; code checks citations, quote locations, availability states, composed claims and finding fixtures. Playwright checks that answers are visible and records cold/warm timing when the web server and browser are available. Evaluation uses an empty review layer.

Twenty held-out situations are evaluated separately by generalisation tier after the H+7 gate. Do not tune against their results beforehand. Raw reports are evidence for human review; only checked numbers belong in submission metrics. Mock runs establish harness behavior and do not count as clinical results.

Challenge documents, copied passages, local evaluation evidence, database dumps and secrets remain outside git. The pre-commit check enforces blocked paths and scans staged content against local document passages when available. The submission screenshot and final working/unsupported feature lists are supplied by the integrator.
