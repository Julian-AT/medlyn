# Verifier dataset

Sources: `ml/data/sample`, `ml/data/synth-v1`. Sampling seed: 37. Input manifest hashes are recorded in datasets/manifest.json.

Synthetic final-document facts rendered with engine templates; German source segments, section headings and immediate neighbours. Labels are intended plus exact-span checked, not independently verified or human gold. No real-patient text is used for training.

```json
{
  "train": {
    "rows": 5001,
    "labels": {
      "supported": 1667,
      "unsupported": 1667,
      "contradicted": 1667
    },
    "patients": 104,
    "families": [
      "compact:cardiac_followup",
      "compact:metabolic_review",
      "compact:renal_review",
      "compact:vascular_workup",
      "consultation:metabolic_review",
      "consultation:pulmonary_review",
      "consultation:renal_review",
      "consultation:vascular_workup",
      "narrative:cardiac_followup",
      "narrative:metabolic_review",
      "narrative:oncology_treatment",
      "narrative:pulmonary_review",
      "narrative:vascular_workup",
      "problem_list:cardiac_followup",
      "problem_list:metabolic_review",
      "problem_list:oncology_treatment",
      "problem_list:renal_review"
    ],
    "mutations": {
      "none": 1667,
      "unsupported_addition": 1434,
      "date_shift": 974,
      "wrong_passage": 233,
      "dose_change": 156,
      "number_change": 369,
      "side_flip": 160,
      "timing_flip": 8
    }
  },
  "valid": {
    "rows": 600,
    "labels": {
      "unsupported": 200,
      "contradicted": 200,
      "supported": 200
    },
    "patients": 35,
    "families": [
      "compact:primary_care_transfer",
      "compact:pulmonary_review",
      "compact:rheumatology_review",
      "consultation:cardiac_followup",
      "consultation:primary_care_transfer",
      "narrative:renal_review",
      "narrative:rheumatology_review",
      "problem_list:primary_care_transfer",
      "problem_list:pulmonary_review",
      "problem_list:rheumatology_review"
    ],
    "mutations": {
      "unsupported_addition": 170,
      "wrong_passage": 30,
      "date_shift": 111,
      "number_change": 51,
      "none": 200,
      "side_flip": 20,
      "dose_change": 15,
      "timing_flip": 3
    }
  },
  "test": {
    "rows": 900,
    "labels": {
      "contradicted": 300,
      "supported": 300,
      "unsupported": 300
    },
    "patients": 36,
    "families": [
      "compact:oncology_treatment",
      "consultation:oncology_treatment",
      "dictated:geriatric_transition",
      "dictated:oncology_surveillance",
      "problem_list:vascular_workup",
      "structured:geriatric_transition",
      "structured:oncology_surveillance"
    ],
    "mutations": {
      "date_shift": 94,
      "none": 300,
      "number_change": 41,
      "unsupported_addition": 253,
      "wrong_passage": 47,
      "date_typo": 89,
      "assertion_flip": 37,
      "side_flip": 20,
      "dose_change": 19
    }
  }
}
```

Patients and generation families are assigned before augmentation by SHA-256 of family. Source-declared validation/test patients are never moved into training. Manifest held-out styles, scenarios, families and mutation types are honoured. Held-out mutation types: assertion_flip, date_typo. Source manifests and assignments are recorded in datasets/manifest.json. Repeated sample/shard patients and exact input duplicates across splits are removed. Prepared documents/facts and original-row hashes are frozen in source-snapshots.jsonl so concurrent source rewrites cannot invalidate span checks. Test inputs take precedence over validation, then training. Each split is downsampled to equal classes.

Supported claims come from final facts. Contradictions change explicit numeric, side, assertion or timing fields; unsupported additions assert a concept absent from the displayed context. This narrow perturbation distribution is a limitation and may inflate performance. No claim of clinical generalisation is justified. Dataset files and real-patient exports are ignored by git. Real cached letter claims are test-only weak labels, never gold.
