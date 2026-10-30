# Submission status

We report the final submission evidence without treating the prototype as clinically
validated. [METRICS.md](../METRICS.md) and the [review sheet](submission/human-check.md)
record the run identity, denominators and repeat failures. The challenge data remains local.

## Challenge checks

The agent-reviewed primary cold free-text and chip matrices each answer **15/15**
questions. The audit locates **166/166** cited facts, finds **0 unsupported lines in
167 reviewed distinct card lines**, and recovers **5 true contradictions with 0 false
findings**. These are API screen-data checks, not browser visibility or clinician review.

The slowest primary cold completion is **10.138 s**, above the under-10 s challenge
target. The slowest confirmed cached completion is **0.239 s**. Repeat cache fills
include unavailable cards and slower requests; strict source/warning checks score
**14/15** in each cached matrix. We make no all-runs pass claim.

The older automatic regression file reports **12/15** answer passes and **3/15** full
suite passes. The saved browser run reports failures and does not certify the current
build. Reports of a different automatic run cannot replace those artifacts without
its identity. This lane neither runs the real suite nor opens new blind results.

## Separate research results

| Population             | Rules macro-F1 | Local macro-F1 | GPT macro-F1 | Cascade macro-F1 |
| :--------------------- | -------------: | -------------: | -----------: | ---------------: |
| Synthetic held-out     |          0.295 |          0.764 |        0.896 |            0.956 |
| Rewritten synthetic    |          0.295 |          0.842 |        0.908 |            0.939 |
| Real text, rule labels |          0.301 |          0.421 |        0.657 |            0.616 |

The synthetic cascade projects **55% fewer GPT calls** in offline replay. It is
research only and trails GPT on real text. The full-data training run reached its
wall-time cap before completing an epoch. See the [model card](../ml/verifier/model-card.md)
and [saved results](../ml/verifier/results.json).

We generated **100,000 synthetic patients**; this is not an ingested-patient count.
The saved synthetic pipeline evaluates **27 screens**, with incomplete availability
coverage. Saved BM25 and hybrid retrieval scores are identical; they establish no
vector benefit. The broader synthetic and multimodal acceptance targets are not met.

The IBM hardware kernel experiment completed on `ibm_marrakesh`. It remains a small
character-hash control with no clinical or quantum advantage claim. See the
[quantum report](../ml/quantum/README.md) and [paper](../paper/main.pdf).

## Integration and submission work

The paper uses frozen numeric aggregates and exact source hashes. Unmeasured browser,
blind-relevance and vector-only rows are removed. The paper and README preserve the
agent review label. [Paper build instructions](../paper/README.md) describe reproduction.

Remaining integration limitations are explicit: corpus and findings publication is
not a single atomic operation; page assets need durable authenticated delivery;
independent PDF/scan agreement and clinician relevance assessment are incomplete.
The public demo has no authentication by user decision. Crawler exclusions provide
no access control. Browser interaction and a final network regression still require
the orchestrator's release check.

Confirm the final team, project license and third-party landing/font permissions.
The final lane handoff records fresh checks and requests; it does not change engine
behavior, contracts, source documents or review state.
