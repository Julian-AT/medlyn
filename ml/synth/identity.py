import hashlib
import json

from .normalise import normalise
from .segments import segment_bounds

HASH_FIELDS = (
    "segmentId",
    "kind",
    "labelEn",
    "attrs",
    "assertion",
    "temporalStatus",
    "eventDate",
    "quote",
    "start",
    "end",
)


def content_hash(fact: dict) -> str:
    payload = {key: fact[key] for key in HASH_FIELDS}
    stable = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(stable.encode()).hexdigest()


def refresh_fact_ids(record: dict) -> dict:
    """Update content identities and every reference after a prose rewrite."""
    segments = {
        document["metadata"]["id"]: segment_bounds(normalise(document["text"]))
        for document in record["documents"]
    }
    mapping = {}
    for fact in record["labels"]["facts"]:
        old_id = fact["id"]
        ordinal = next(
            (
                i
                for i, (start, end) in enumerate(segments[fact["documentId"]])
                if start <= fact["start"] and end >= fact["end"]
            ),
            None,
        )
        if ordinal is None:
            raise ValueError(f"Fact crosses engine segments: {fact['id']}")
        fact["segmentId"] = f"{fact['documentId']}-s{ordinal}"
        fact["contentHash"] = content_hash(fact)
        fact["id"] = "f-" + fact["contentHash"][:16]
        mapping[old_id] = fact["id"]
    for entry in record.get("documentationPlan", []):
        entry["states"] = [mapping[fact_id] for fact_id in entry["states"]]
    for mutation in record["labels"]["mutations"]:
        if mutation["factId"]:
            mutation["factId"] = mapping[mutation["factId"]]
    for group in ("contradictions", "distractors"):
        for finding in record["labels"][group]:
            for passage in finding["passages"]:
                if passage.get("factId"):
                    passage["factId"] = mapping[passage["factId"]]
    return record
