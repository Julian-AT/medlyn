# Medlyn: two-minute video

One continuous screen recording with you on camera. The skeleton video `docs/video/skeleton.mp4` shows every segment with its time window, what to show and a countdown, so you can rehearse against it. About 270 words in total at roughly 135 words per minute.

Numbers in `[brackets]` come from `METRICS.md` and `ml/verifier/results.json` on recording day. Never say a number that is not in those files.

## Segments

| #   | Time         | Seconds | Show                                                                                | Say (word budget) |
| --- | ------------ | ------- | ----------------------------------------------------------------------------------- | ----------------- |
| 1   | 0:00 to 0:08 | 8       | You on camera, then the Home page                                                   | ~18 words         |
| 2   | 0:08 to 0:28 | 20      | Chat: anaesthetist question, generated cards, source popup with German and English  | ~45 words         |
| 3   | 0:28 to 0:45 | 17      | Situations › Emergency: carotid contradiction comparator, "Not documented · 8 of 8" | ~38 words         |
| 4   | 0:45 to 0:55 | 10      | GP letter with citations, or Open questions → Investigate                           | ~22 words         |
| 5   | 0:55 to 1:05 | 10      | Paper, zoomed on Figure 1 (architecture, claim boundary)                            | ~22 words         |
| 6   | 1:05 to 1:22 | 17      | Hugging Face model card (results table), dataset page, paper benchmark table        | ~38 words         |
| 7   | 1:22 to 1:37 | 15      | Research › Evaluation quantum card, paper quantum figure, ibm_marrakesh job         | ~32 words         |
| 8   | 1:37 to 1:48 | 11      | Research › Evaluation: the five challenge metrics                                   | ~25 words         |
| 9   | 1:48 to 2:00 | 12      | End card: what does not work yet, URL                                               | ~28 words         |

## Script

**1. Intro (0:00 to 0:08)**
"This is Medlyn. It shows a clinician the patient facts for one task, and every fact links to its source."

**2. Chat (0:08 to 0:28)**
Type: "I'm the anaesthetist, pre-op check before her quadrantectomy on 16 May."
"I type my role and task. Medlyn answers with structured cards: the blood thinner, the contrast allergy, the heart function. Each line opens its source, the original German sentence with a translation."

**3. Situations (0:28 to 0:45)**
Click the Emergency situation, open the carotid badge, point at the kidney gap.
"A different task changes the view. Here the record contradicts itself on the side of the carotid stenosis, and kidney function is not documented after checking all eight documents."

**4. Workflow (0:45 to 0:55)**
Open the GP letter (or Investigate one open question).
"From there I can investigate open questions and draft a GP letter where every sentence keeps its citation."

**5. Architecture (0:55 to 1:05)**
Paper, Figure 1.
"Under the hood, the language model never writes facts. It selects located evidence, templates render it, and one validator checks every output."

**6. Own model (1:05 to 1:22)**
Hugging Face model card, dataset page, paper benchmark table.
"We generated one hundred thousand synthetic patients with exact labels and trained our own claim verifier with QLoRA on a MacBook. It reaches macro F1 of [x] against [y] for the base model. Model and dataset are on Hugging Face."

**7. Quantum (1:22 to 1:37)**
Quantum card and figure.
"As a research experiment we ran a quantum kernel and QAOA with Qiskit, including a run on IBM's 156-qubit Marrakesh processor. It matches the classical baseline; there is no quantum advantage at this scale."

**8. Metrics (1:37 to 1:48)**
Research › Evaluation.
"On the five challenge situations: [15] of 15 answers, [100] percent traceable sources, [0] invented facts, [5] contradictions with no false alarms."

**9. What does not work yet (1:48 to 2:00)**
End card with three lines and aim.julianschmidt.cv.
"What does not work yet: typed situations are still slower than we want, PDF extraction misses facts, and our verifier is trained on synthetic data only. Medlyn is live at aim.julianschmidt.cv."

## Before recording

- Use the deployed app at app.aim.julianschmidt.cv in a 1440 × 900 window, with the cache warmed and the review layer reset.
- Open the tabs in advance: app, Hugging Face model, Hugging Face dataset, paper PDF at Figure 1.
- Rehearse once against `docs/video/skeleton.mp4`.
