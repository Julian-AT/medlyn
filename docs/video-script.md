# Medlyn: two-minute video

One continuous take, you on camera at the start and end, screen recording in between. Speak fast (about 165 words per minute, roughly 330 words in total). Rehearse against `docs/video/skeleton.mp4`; its countdown turns red with three seconds left in a segment.

Every number comes from `METRICS.md`, `ml/verifier/results.json`, `ml/quantum/results.json`, the synthetic manifest or `paper/main.pdf`. Do not round them differently on camera.

## Running order

| #   | Time         | Segment      | Main screen                                    |
| --- | ------------ | ------------ | ---------------------------------------------- |
| 1   | 0:00 to 0:07 | Cold open    | You on camera, then app.medlyn.health          |
| 2   | 0:07 to 0:28 | Agent        | Chat: tool calls, streamed cards, source popup |
| 3   | 0:28 to 0:44 | Situations   | Emergency: conflict comparator, proven absence |
| 4   | 0:44 to 0:58 | Architecture | Paper Figure 1 and Figure 2                    |
| 5   | 0:58 to 1:20 | Own model    | Hugging Face dataset, paper Table 4            |
| 6   | 1:20 to 1:38 | Quantum      | IBM Quantum job, paper quantum appendix        |
| 7   | 1:38 to 1:50 | Results      | Research › Evaluation                          |
| 8   | 1:50 to 2:00 | Close        | You on camera, medlyn.health end card          |

Overlays are optional lower-thirds in monospace (for example JetBrains Mono, white on near-black). Add them in the edit; they carry the hard numbers so you can speak faster.

## Script

### 1. Cold open (0:00 to 0:07)

| At   | Show                                                         | Overlay                                      |
| ---- | ------------------------------------------------------------ | -------------------------------------------- |
| 0:00 | You on camera, tight framing                                 |                                              |
| 0:04 | Hard cut to app.medlyn.health home, cursor blinking in input | `8 documents · 1 patient · 0 invented facts` |

> "Eight German clinical documents. One patient. Three minutes before surgery. Medlyn shows what matters, and proves every line."

### 2. Agent (0:07 to 0:28)

| At   | Show                                                                               | Overlay                                |
| ---- | ---------------------------------------------------------------------------------- | -------------------------------------- |
| 0:07 | Paste the prompt and press Enter (see below)                                       |                                        |
| 0:10 | Tool steps appear in the chain-of-thought list; hover one to show the typed call   | `typed tool calls · AI SDK v7`         |
| 0:15 | Cards stream in: aspirin, contrast allergy, ejection fraction                      | `425 located facts`                    |
| 0:20 | Click the aspirin line: the source popup opens with the German passage highlighted | `UTF-16 character offsets`             |
| 0:24 | Toggle to English in the popup                                                     | `model selects IDs · templates render` |

Prompt: "I'm the anaesthetist, pre-op check before her quadrantectomy on 16 May."

> "I give a role and a task. The agent plans typed tool calls over a graph of four hundred twenty-five located facts and streams generative UI: aspirin, the contrast allergy, ejection fraction sixty percent. Click any line and character offsets open the exact German sentence, translated. The model only selects fact IDs. It never writes a fact."

### 3. Situations (0:28 to 0:44)

| At   | Show                                                                             | Overlay                                        |
| ---- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| 0:28 | Sidebar › Situations, click the Emergency chip; cards appear immediately         | `cached · 0.24 s`                              |
| 0:31 | Open the carotid conflict: the comparator popup shows both passages side by side | `same letter · left vs right`                  |
| 0:37 | Close it, point the cursor at the kidney function "Not documented" card          | `lexical + vector + full-text pass · 8/8 docs` |

> "Switch the task and the screen re-plans. Carotid stenosis: one letter says left and right, so Medlyn shows both passages instead of guessing. Kidney function is marked not documented only after lexical search, vector search and a full-text pass over every document. Absence is proven, not assumed."

### 4. Architecture (0:44 to 0:58)

| At   | Show                                                         | Overlay                              |
| ---- | ------------------------------------------------------------ | ------------------------------------ |
| 0:44 | Paper Figure 1 full screen, slow zoom on the ingestion tower | `quote + every number must locate`   |
| 0:50 | Pan to the retrieval block                                   | `BM25 ⊕ Gemini Embedding 2 → RRF`    |
| 0:54 | Cut to Figure 2, the claim validation flow                   | `one claim boundary · every channel` |

> "Under the hood, two towers. Ingestion stores a fact only if its quote and every number are located in the source. Retrieval fuses BM25 and Gemini embeddings with reciprocal rank fusion. One claim validator gates chat, cards, speech and the GP letter."

### 5. Own model (0:58 to 1:20)

| At   | Show                                                                  | Overlay                                                       |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0:58 | Hugging Face dataset page `JulianAT/medlyn-synth-v1`, scroll the card | `100k patients · 900k docs · 4.8M facts · 60k contradictions` |
| 1:07 | Hugging Face model page `JulianAT/medlyn-verifier-qwen3-1.7b-lora`    | `Qwen3-1.7B · 4-bit · LoRA r16 · MLX · M4 Pro`                |
| 1:12 | Paper Table 4, highlight the cascade row                              | `macro-F1 0.956 · −55% GPT calls`                             |

> "Real patient data can't train a model, so we generated our own: one hundred thousand synthetic patients, nine hundred thousand documents, four point eight million labelled facts, sixty thousand planted contradictions. On that we fine-tuned Qwen3 with QLoRA in MLX, on a MacBook. As a cascade it answers first and escalates only when unsure: fifty-five percent fewer GPT calls, six points higher F1."

### 6. Quantum (1:20 to 1:38)

| At   | Show                                                              | Overlay                                             |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------- |
| 1:20 | Research › Evaluation, scroll to the quantum research card        | `8-qubit ZZ feature map · QAOA · Qiskit 2`          |
| 1:25 | IBM Quantum job page, job `dbi5p85ep8hs73an8gmg` on ibm_marrakesh | `156 qubits · 136 circuits · 1024 shots · 53 s QPU` |
| 1:31 | Paper Appendix A: the ibm_marrakesh hardware paragraph            | `depth ≈ 760 · MAE 0.066 vs simulation`             |

> "Then we went quantum. An eight-qubit ZZ feature-map kernel for claim verification and QAOA for evidence selection, built in Qiskit and run on IBM's hundred-fifty-six-qubit Marrakesh: one hundred thirty-six circuits, fifty-three seconds of QPU. Simulated, it is on par with a classical SVM. On hardware, circuit depth seven hundred sixty drowns the signal."

### 7. Results (1:38 to 1:50)

| At   | Show                                          | Overlay                                        |
| ---- | --------------------------------------------- | ---------------------------------------------- |
| 1:38 | Research › Evaluation, the regression table   | `15/15 answers`                                |
| 1:43 | Scroll to traceability and contradiction rows | `166/166 traced · 0 invented · 0 false alarms` |

> "On the challenge set: fifteen of fifteen answers, one hundred sixty-six of one hundred sixty-six lines traced to source, zero invented facts, five real contradictions, zero false alarms."

### 8. Close (1:50 to 2:00)

| At   | Show                                   | Overlay         |
| ---- | -------------------------------------- | --------------- |
| 1:50 | You on camera                          |                 |
| 1:56 | End card: Medlyn logo, `medlyn.health` | `medlyn.health` |

> "Not done yet: cold screens take up to ten seconds, and our model still trails GPT on real text. Every claim checked. Medlyn is live at medlyn.health."

## Before recording

- app.medlyn.health in a 1440 × 900 window, light theme, browser zoom 110%, cursor highlight on.
- Run the Emergency situation once beforehand so it loads from cache; reset the review layer; open a fresh chat.
- Copy the segment 2 prompt to the clipboard; pasting saves about four seconds over typing.
- Tabs in this order: app, Hugging Face dataset, Hugging Face model, IBM Quantum job, `paper/main.pdf` at Figure 1, Research › Evaluation.
- In the PDF, stay on Figure 1, Figure 2, Table 4 and the quantum appendix. Figure 4 still has panels marked "pending".
- If the cold chat answer is slow, cut the wait in the edit rather than talking over it.

## Number sources

| Spoken                                                                | Source                                              |
| --------------------------------------------------------------------- | --------------------------------------------------- |
| 425 facts, 15/15, 166/166, 0 invented, 5 contradictions, 0.24 s, 10 s | `METRICS.md`                                        |
| 100k / 900k / 4.8M / 60k                                              | synthetic manifest, Hugging Face dataset card       |
| 0.956 cascade, 55% fewer calls, +5.7 F1, real-text gap                | `ml/verifier/results.json` (full-v2), paper Table 4 |
| 8 qubits, 136 circuits, 53 s, depth 760, MAE 0.066                    | `ml/quantum/results.json`                           |
