"""Export only explicitly allowlisted synthetic verifier inputs."""

import json

from verifier.common import messages

from .common import read_jsonl
from .splits import SplitGuard, split_name

VERIFIER_FILES = {
    "train": "train.examples.jsonl",
    "validation": "valid.examples.jsonl",
    "test": "test.examples.jsonl",
}


def verifier_rows(folder, scanner, guard=None):
    guard = guard or SplitGuard()
    for split, filename in VERIFIER_FILES.items():
        path = folder / filename
        if path.is_symlink():
            raise ValueError("Verifier inputs cannot be symlinks")
        count = 0
        for row in read_jsonl(path):
            if row.get("source") != "synthetic":
                raise ValueError("Verifier export rejects every non-synthetic source")
            patient, family = row["patientId"], row["family"]
            guard.add(patient, family, split)
            if "split" in row and split_name(row["split"]) != split:
                raise ValueError("Verifier row declares the wrong split")
            if row["label"] not in {"supported", "unsupported", "contradicted"}:
                raise ValueError("Unknown verifier label")
            chat = messages(row["claim"], row["passages"])
            chat += [
                {
                    "role": "assistant",
                    "content": json.dumps(
                        {key: row[key] for key in ("label", "assertion", "timing")}
                    ),
                }
            ]
            scanner.check({"row": row, "messages": chat}, f"verifier/{split}/{count}")
            yield {
                "patient_id": patient,
                "family": family,
                "split": split,
                "source": "synthetic",
                "claim": row["claim"],
                "label": row["label"],
                "assertion": row["assertion"],
                "timing": row["timing"],
                "mutation": row["mutation"],
                "document_id": row["documentId"],
                "fact_id": row.get("factId"),
                "quote_hash": row.get("quoteHash"),
                "start": row["start"],
                "end": row["end"],
                "passages": json.dumps(row["passages"], ensure_ascii=False),
                "messages": json.dumps(chat, ensure_ascii=False),
            }
            count += 1
        if count == 0:
            raise ValueError(f"Verifier {split} is empty")
