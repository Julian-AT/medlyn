# Medlyn: two-minute video

One continuous screen recording with you on camera, spoken fast (about 165 words per minute, roughly 330 words). The skeleton video `docs/video/skeleton.mp4` shows every segment with its time window, what to show and a countdown.

Numbers in `[brackets]` come from `METRICS.md`, `ml/verifier/results.json` and `ml/quantum/results.json` on recording day. Never say a number that is not in those files.

## Segments

| #   | Time         | Seconds | Show                                                                      | Words |
| --- | ------------ | ------- | ------------------------------------------------------------------------- | ----- |
| 1   | 0:00 to 0:07 | 7       | You on camera, then Home                                                  | ~20   |
| 2   | 0:07 to 0:27 | 20      | Chat: anaesthetist question, streamed tool cards, source popup DE/EN      | ~55   |
| 3   | 0:27 to 0:44 | 17      | Situations › Emergency: C1 comparator, "Not documented · 8 of 8"          | ~47   |
| 4   | 0:44 to 0:54 | 10      | Paper, Figure 1                                                           | ~28   |
| 5   | 0:54 to 1:06 | 12      | Paper or app: hybrid retrieval, absence check, contradiction adjudication | ~33   |
| 6   | 1:06 to 1:24 | 18      | Hugging Face model card and dataset, benchmark table                      | ~50   |
| 7   | 1:24 to 1:39 | 15      | Quantum card, paper quantum figure                                        | ~41   |
| 8   | 1:39 to 1:50 | 11      | Research › Evaluation metrics                                             | ~28   |
| 9   | 1:50 to 2:00 | 10      | End card: what does not work yet, URL                                     | ~28   |

## Script

**1. Intro (0:00 to 0:07)**
"Medlyn turns eight German clinical documents into a task-specific view, where every single line is traceable to a located quote."

**2. Chat (0:07 to 0:27)**
Type: "I'm the anaesthetist, pre-op check before her quadrantectomy on 16 May."
"I state role and task. The agent calls typed tools over the fact graph and streams generative UI: antithrombotics, the contrast allergy, ejection fraction. Each line carries character offsets into its source segment, so one click shows the original German sentence and its translation."

**3. Situations (0:27 to 0:44)**
Emergency situation, carotid badge, kidney gap.
"Switch the task and the lens re-plans from a needs catalog. The carotid stenosis side contradicts itself inside one letter, adjudicated with both passages. And kidney function is not documented: that needs a full absence check across all eight eligible documents, never just a missed search."

**4. Architecture (0:44 to 0:54)**
Paper, Figure 1.
"The architecture is two towers. Ingestion extracts atomic facts and keeps one only if its quote is located in the text. The live lens never lets the model write facts: it selects fact IDs, templates render."

**5. Engine details (0:54 to 1:06)**
Paper Section 3 or the app.
"Retrieval is hybrid: BM25 plus Gemini embeddings, fused with reciprocal rank fusion. And every output channel, cards, chat, speech and the GP letter, passes one shared claim validator."

**6. Own model (1:06 to 1:24)**
Hugging Face model card, dataset page, benchmark table.
"For our own model we generated one hundred thousand synthetic patients, four point eight million labelled facts, with controlled mutations as negatives. We fine-tuned Qwen3 with QLoRA in MLX on a MacBook as a claim verifier: macro F1 [x] versus [y] zero-shot, and it cuts [z] percent of GPT calls in a cascade. Open on Hugging Face."

**7. Quantum (1:24 to 1:39)**
Quantum card, paper quantum figure.
"As a research track we built an eight-qubit ZZ feature-map quantum kernel and QAOA for evidence selection in Qiskit, and executed the kernel on IBM's one-hundred-fifty-six-qubit Marrakesh processor. Result: on par with classical baselines, no advantage at this scale."

**8. Metrics (1:39 to 1:50)**
Research › Evaluation.
"On the five challenge situations: [15] of 15 answers, [100] percent traceability, [0] invented facts, all [5] contradictions with zero false alarms, slowest screen [x] seconds."

**9. What does not work yet (1:50 to 2:00)**
End card.
"Not there yet: cold typed situations are slower than our target, PDF extraction misses facts, and the verifier is synthetic-trained. Live at medlyn.health."

## Before recording

- Deployed app at app.medlyn.health in a 1440 × 900 window, cache warmed, review layer reset.
- Tabs open in advance: app, Hugging Face model, Hugging Face dataset, paper PDF at Figure 1.
- Rehearse once against `docs/video/skeleton.mp4`; the countdown turns red with three seconds left.
