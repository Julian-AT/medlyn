# Medlyn: two-minute recording script

For the recorder and editor. Deliver one video of at most 2:00, including the final
15 seconds on limitations. Use this with the [submission checklist](submission/checklist.md)
and [human-check sheet](submission/human-check.md). This is a recording plan, not
evidence that the final integrated application has passed these steps.

## Shot list

Timecodes are elapsed video time. Voice-over is plain English; quoted prompts are
typed on screen. Keep the cold submission-to-complete interval continuous at normal
speed. Cuts between destinations are fine, but label any omitted waiting time.

| Time      | On-screen action                                                                                                                                                                                                                                                                                                  | Voice-over                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:06 | Home `/`. Show the selected demonstration patient and empty chat composer.                                                                                                                                                                                                                                        | “Medlyn gives a clinician the patient facts for the task, with evidence for each one.”                                                                                                                                                      |
| 0:06–0:24 | Type: “I am the anaesthetist doing the pre-operative check before her quadrantectomy with IORT on 16 May 2016. Show the clinical view.” Submit into `/chat/[id]`. Show the generated clinical cards. Open the antithrombotic source popup, switch DE/EN, then close it.                                           | “I type my role and task. Medlyn opens a clinical view in chat. Medicines, allergies and heart function link to the original passage and its translation.”                                                                                  |
| 0:24–0:42 | Open `/situations`, select **Emergency dizziness**. Use this as the prepared cold take. Show the changed cards, **Carotid stenosis and side** with C1 and its comparator. Show **Before contrast** and the kidney-function gap, including **Not documented · 8 of 8** coverage or its equivalent separate labels. | “A different task changes the view. The carotid side conflicts within the record. Kidney function is not documented after all eight eligible documents were checked.”                                                                       |
| 0:42–0:49 | Select **Open follow-ups** first, then `/open-questions`. Point to the carotid ultrasound completion question. Keep contradictions and clarification requests visibly separate.                                                                                                                                   | “Open questions brings together conflicting findings and missing follow-up evidence.”                                                                                                                                                       |
| 0:49–1:00 | Choose **Investigate** for carotid ultrasound completion. In chat, show the real tool progress and checked answer. Return to the question and choose **Leave open**.                                                                                                                                              | “Investigate checks the record. No recorded completion is different from saying the test never happened. I leave the question open.”                                                                                                        |
| 1:00–1:14 | Open `/letter`, generate the GP follow-up draft. Show recommendations, completion status, the explicit C1 clarification request and a citation popup. Make one rehearsed unsupported factual edit; show it separated as a clinician note while the validated original remains.                                    | “The GP letter keeps its citations and asks for clarification. An unsupported edit becomes a labelled clinician note rather than a new patient fact.”                                                                                       |
| 1:14–1:25 | Return to Home and type: “I am a dentist before a tooth extraction. Show the relevant clinical view.” Show the returned tier-3 view and its real source controls.                                                                                                                                                 | “A dentist is outside the configured profiles. The same evidence rules still apply to the generated view.”                                                                                                                                  |
| 1:25–1:38 | Open **Research › Evaluation**, `/research/evaluation`. Show the actual saved regression result and latency, then the separately labelled synthetic, retrieval and verifier sections. Keep the human-check status visible.                                                                                        | “The latest engine regression reports fifteen of fifteen. Final screen review is still pending. Synthetic, retrieval and verifier experiments have separate results and denominators.”                                                      |
| 1:38–1:45 | Scroll to **Quantum research experiment** on the same page. Keep the offline-control, human-check and hardware-status labels in frame.                                                                                                                                                                            | “The quantum card is an offline research control. It is not part of clinical decisions.”                                                                                                                                                    |
| 1:45–2:00 | Hold a readable end card headed **What does not work yet** with three lines: “Cold speed target not met consistently”; “PDF/scan agreement and large-scale testing incomplete”; “Research validation pending; no quantum advantage shown”.                                                                        | “Cold runs still miss our speed target. PDF and scan extraction misses facts, and large-scale testing is incomplete. Research results need human review. The local verifier remains experimental, and no quantum advantage is established.” |

## Recording checklist

- [ ] Freeze the integrated app version and Neon demo branch with the orchestrator.
  Confirm the configured database is that branch. Do not switch or modify the shared
  ingest database from this lane. Select `patient-0000-0001`, as of 15 Apr 2016.
- [ ] Reset the active patient's review layer in `/reviews`; confirm no accepted,
  corrected or dismissed overlay remains. Start a clean chat. A fresh browser tab
  alone does not prove a clean review layer. Reset the rehearsal's **Leave open**
  review after recording and before jury use.
- [ ] Confirm real engine mode, eight eligible documents and no mock indicator.
  Rehearse every source popup, DE/EN translation, comparator and full-document link.
- [ ] After the final cache-version integration, have the orchestrator run `pnpm warm`.
  All five lenses must warm successfully. Rehearse chat, investigation and letter.
  Keep a new dentist prompt for the live take and confirm its returned tier is 3.
- [ ] Prepare one genuinely cold emergency take with the orchestrator after warming
  the other views. Confirm that request's completion reports `cached: false`; warm
  cache-generation time is not a cached request. No cold-cache UI switch is assumed.
  Keep a local request/timing record, never credentials in the video.
- [ ] Choose **dark** for this take, or **light** if popup text is clearer. Keep one
  theme throughout. Record a 1440px-wide browser window at 100% zoom, with readable
  text and no horizontal clipping. Disable notifications and hide unrelated tabs.
- [ ] Check `/open-questions` retains the completed follow-up lens and its gaps.
  **Run a situation to check gaps** is not evidence of absence. If a check fails,
  show **Couldn't check** honestly and fix or revise the take before submission.
- [ ] Rehearse letter generation and the unsupported-edit example. Verify the
  factual body keeps its validated sentence and attached evidence. Do not invent
  patient details for the example or paste document prose into these instructions.
- [ ] Confirm Research Evaluation uses the final coherent run. Its runtime source is
  `eval/output/regression.json`; older bundles may still show 9/15. Do not overlay
  15/15 onto older UI results or call automated scores human-checked. If the human
  sheet and final metrics are signed off before recording, replace only the review
  sentence with: “A reviewer checked all fifteen answers on the final screens.”
- [ ] Confirm the quantum card is mounted and readable. Its component exists but
  was not mounted in the page inspected for this handoff. Integration is required
  before recording that shot. Keep it labelled research-only and use actual values.
- [ ] Check narration fits each slot. If any operation overruns, rehearse again;
  shorten navigation or prose, preserving the cold interval and 15-second ending.
  Never imply that an edited wait is a measured load time.
- [ ] Watch the exported file from start to end. Verify duration ≤120 seconds,
  audible narration, legible captions, real sources and no secrets. Store footage
  locally outside git. Submit through the challenge's chosen video channel, not
  by committing challenge passages, screen captures or recordings to the repo.

## Claims to keep out of the take

Do not claim human-checked 15/15 before the sheet is completed, 100k patients ingested,
150 synthetic challenges executed, 95% PDF/scan agreement, consistent cold <5 seconds,
or clinical/quantum advantage. The current evidence and outstanding gates are in
[build status](status.md). A source popup proves only the inspected citation;
traceability needs the screen-wide audit in the human-check sheet.
