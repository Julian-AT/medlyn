import argparse
import json
import re
from pathlib import Path

from .catalog import CONDITIONS, GAP_CONCEPTS, HELD_MUTATIONS, HELD_STYLES
from .identity import content_hash
from .normalise import missing_tokens, normalise, schedule_checks, span_text

FACT_KINDS = {
    "diagnosis",
    "medication",
    "allergy",
    "procedure",
    "measurement",
    "lab",
    "imaging",
    "histology",
    "receptor",
    "staging",
    "symptom",
    "event",
    "recommendation",
    "family_history",
    "social_history",
    "demographic",
}


def validate_patient(record: dict) -> dict:
    texts = {d["metadata"]["id"]: normalise(d["text"]) for d in record["documents"]}
    labels = record["labels"]
    facts = {fact["id"]: fact for fact in labels["facts"]}
    assert len(facts) == len(labels["facts"]), "Duplicate fact ids"
    assert len(texts) == len(record["documents"]), "Duplicate document ids"

    def passage_text(passage):
        text = texts[passage["documentId"]]
        assert 0 <= passage["start"] < passage["end"], "Invalid passage bounds"
        quote = span_text(text, passage["start"], passage["end"])
        assert quote, "Empty passage"
        return quote

    for fact in facts.values():
        quote = passage_text(fact)
        assert quote == fact["quote"], f"Quote mismatch: {fact['id']}"
        assert fact["contentHash"] == content_hash(fact), "Content hash mismatch"
        assert fact["id"] == "f-" + fact["contentHash"][:16], "Fact id mismatch"
        assert fact["kind"] in FACT_KINDS, "Unknown fact kind"
        assert fact["assertion"] in ("present", "negated", "suspected", "historical")
        assert fact["temporalStatus"] in (
            "planned",
            "recommended",
            "done",
            "ongoing",
            "given_once",
            "stated",
        )
        fields = {key: fact.get(key) for key in ("labelEn", "attrs", "eventDate", "dueDate")}
        missing = missing_tokens(fields, quote)
        assert not missing, f"Missing tokens {missing}: {fact['id']}"
        assert schedule_checks(fields, quote), f"Schedule mismatch: {fact['id']}"
    contradictions = {c["id"]: c for c in labels["contradictions"]}
    assert len(contradictions) == len(labels["contradictions"])
    for finding in labels["contradictions"] + labels["distractors"]:
        assert len(finding["passages"]) >= 2
        for passage in finding["passages"]:
            passage_text(passage)
            if passage.get("factId"):
                assert passage["factId"] in facts
                fact = facts[passage["factId"]]
                assert all(passage[k] == fact[k] for k in ("documentId", "start", "end"))
    for mutation in labels["mutations"]:
        assert passage_text(mutation) == mutation["mutated"]
        assert mutation["original"] != mutation["mutated"]
        assert mutation["factId"] in facts
        finding = contradictions[mutation["contradictionId"]]
        assert finding["category"] == mutation["type"]
        assert passage_text(finding["passages"][0]) == mutation["original"]
        assert passage_text(finding["passages"][1]) == mutation["mutated"]
    present_needs = {need for fact in facts.values() for need in fact.get("needIds", [])}
    for gap in labels["gaps"]:
        assert gap["needId"] in GAP_CONCEPTS
        assert gap["needId"] not in present_needs, "Gap has a documented fact"
    if "documentationPlan" in record:
        planned_ids = {f for entry in record["documentationPlan"] for f in entry["states"]}
        assert planned_ids == set(facts), "Documentation plan and final labels differ"
    if "history" in record:
        # Independently check that every planned condition was actually stated, not just assigned a span.
        all_text = "\n".join(texts.values())
        for condition in record["history"]["conditions"]:
            assert CONDITIONS[condition][0] in all_text, "Planned diagnosis was lost"
    generation = record["generation"]
    if generation["split"] != "test":
        assert generation["style"] not in HELD_STYLES
        assert not set(generation["mutationTypes"]) & set(HELD_MUTATIONS)
    assert 3 <= len(texts) <= 15
    return {
        "facts": len(facts),
        "documents": len(texts),
        "mutations": len(labels["mutations"]),
        "contradictions": len(contradictions),
        "distractors": len(labels["distractors"]),
        "gaps": len(labels["gaps"]),
    }


def scan_challenge(paths: list[Path], data_path: Path) -> dict:
    """Compare all 120-character windows; stronger than the pre-commit hook's stride."""

    def folded(text):
        return re.sub(r"\s+", " ", normalise(text))

    sources = []
    for file in sorted((data_path / "documents").glob("*.json")):
        sources.append(folded(json.loads(file.read_text())["text"]))
    checked = 0
    for root in paths:
        files = root.rglob("*") if root.is_dir() else [root]
        for file in files:
            if not file.is_file() or file.suffix not in (".py", ".mjs", ".md", ".json", ".jsonl"):
                continue
            target = folded(file.read_text())
            windows = {target[i : i + 120] for i in range(max(0, len(target) - 119))}
            for source in sources:
                assert not any(
                    source[i : i + 120] in windows for i in range(max(0, len(source) - 119))
                ), f"Challenge overlap: {file}"
            checked += 1
    return {"files": checked, "challengeDocuments": len(sources), "overlaps": 0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/synth-v1"))
    args = parser.parse_args()
    counts = {}
    patients = 0
    for shard in sorted((args.data / "shards").glob("*.jsonl")):
        for line in shard.open():
            for key, value in validate_patient(json.loads(line)).items():
                counts[key] = counts.get(key, 0) + value
            patients += 1
    assert patients, "No patients found"
    print(json.dumps({"patients": patients, **counts, "failures": 0}))


if __name__ == "__main__":
    main()
