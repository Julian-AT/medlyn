# Medlyn: two-minute video

One continuous screen recording with you on camera, spoken fast (about 165 words per minute). Rehearse against `docs/video/skeleton.mp4`; the countdown turns red with three seconds left. Every number below comes from `METRICS.md`, `ml/verifier/results.json`, `ml/quantum/results.json` and the synthetic manifest.

| #   | Time         | Show                                                      |
| --- | ------------ | --------------------------------------------------------- |
| 1   | 0:00 to 0:07 | You on camera, then app.medlyn.health                     |
| 2   | 0:07 to 0:27 | Chat: anaesthetist question, streamed cards, source popup |
| 3   | 0:27 to 0:44 | Situations › Emergency: carotid comparator, kidney gap    |
| 4   | 0:44 to 0:56 | Paper Figure 1, then the hybrid retrieval line            |
| 5   | 0:56 to 1:16 | Hugging Face dataset and model, results table             |
| 6   | 1:16 to 1:36 | Quantum card, ibm_marrakesh job, paper quantum figure     |
| 7   | 1:36 to 1:50 | Research › Evaluation metrics                             |
| 8   | 1:50 to 2:00 | End card: not there yet, medlyn.health                    |

## Script

**1. Hook (0:00 to 0:07)**
"Eight German clinical documents, one patient, three minutes before surgery. Medlyn turns that into a task view where every line points to its exact source."

**2. Chat (0:07 to 0:27)**
Type: "I'm the anaesthetist, pre-op check before her quadrantectomy on 16 May."
"I state role and task. The agent calls typed tools over a graph of 425 located facts and streams generative UI: aspirin 100 milligrams, the contrast allergy, ejection fraction 60 percent. Every line carries character offsets into its source, so one click shows the German sentence and the translation."

**3. Situations (0:27 to 0:44)**
"Switch the task and the screen re-plans. The carotid stenosis side contradicts itself inside one letter, adjudicated with both passages. Kidney function is not documented, and that claim is only made after a full check of all eight documents."

**4. Architecture (0:44 to 0:56)**
"Two towers. Ingestion keeps a fact only if its quote is located in the text. At query time the model never writes facts: it selects fact IDs, templates render, and one claim validator gates chat, cards, speech and the GP letter. Retrieval fuses BM25 with Gemini embeddings."

**5. Own model (0:56 to 1:16)**
"To train our own verifier we generated one hundred thousand synthetic patients: nine hundred thousand documents, four point eight million labelled facts, sixty thousand planted contradictions. We fine-tuned Qwen3 with QLoRA in MLX on a MacBook. In a cascade it answers first and calls GPT only when unsure: forty-seven percent fewer GPT calls for under four points of accuracy. Dataset and model are on Hugging Face."

**6. Quantum (1:16 to 1:36)**
"And we went quantum. An eight-qubit ZZ feature-map kernel and QAOA for evidence selection, built in Qiskit, and run on IBM's one-hundred-fifty-six-qubit Marrakesh processor: one hundred thirty-six circuits, fifty-three seconds of QPU time. In simulation it matches a classical SVM. On hardware, circuit depth of seven hundred sixty drowns the signal in noise. Measured, not hyped."

**7. Metrics (1:36 to 1:50)**
"On the five challenge situations: fifteen of fifteen answers, one hundred percent traceable, zero invented facts, five contradictions and zero false alarms. Cached screens load in a quarter of a second."

**8. Not there yet (1:50 to 2:00)**
"Not there yet: cold typed situations take up to ten seconds, and our verifier still trails GPT on real text. Medlyn is live at medlyn.health."

## Before recording

- app.medlyn.health in a 1440 × 900 window, light theme, cache warmed, review layer reset, fresh chat.
- Tabs ready: app, Hugging Face dataset and model, paper PDF at Figure 1, Research › Evaluation.
- Use the Emergency chip for segment 3 (cached, instant). Type the anaesthetist prompt for segment 2.
