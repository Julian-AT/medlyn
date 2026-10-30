"""Build balanced chat examples from final synthetic spans, never from challenge text."""

import argparse
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

from .common import LABELS, ROOT, VERIFIER_DIR, Bridge, messages, read_jsonl, write_jsonl

DEFAULT_HELDOUT = {"date_shift", "assertion_flip"}


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def family_split(family, heldout=()):
    if family in heldout:
        return "test"
    bucket = int(digest(family)[:8], 16) % 10
    return "test" if bucket == 0 else "valid" if bucket == 1 else "train"


def source_rows(source):
    index = {}
    if (source / "index.jsonl").exists():
        index = {row["patientId"]: row for row in read_jsonl(source / "index.jsonl")}
    paths = sorted((source / "shards").glob("*.jsonl"))
    if not paths:
        paths = sorted(source.glob("*.jsonl"))
        paths = [p for p in paths if p.name != "index.jsonl"]
    paths += sorted(source.glob("*.json"))
    for path in paths:
        if path.name == "manifest.json":
            continue
        rows = read_jsonl(path) if path.suffix == ".jsonl" else [json.loads(path.read_text())]
        for row in rows:
            if not isinstance(row, dict) or "patient" not in row or "labels" not in row:
                continue
            meta = {**row, **row.get("generation", {}), **index.get(row["patient"]["id"], {})}
            family = meta.get("family") or row["patient"].get("family")
            if not family:
                raise ValueError(f"Missing generation family for {row['patient']['id']}")
            yield row, str(family), meta.get("split")


def perturbations(claim, fact):
    # Changes are made only to a corresponding explicit field, never arbitrary prose numbers.
    attrs = fact["attrs"]
    side = attrs.get("side")
    if side in ("left", "right") and re.search(rf"\b{side}\b", claim, re.IGNORECASE):
        yield (
            "side_flip",
            re.sub(
                rf"\b{side}\b", "right" if side == "left" else "left", claim, flags=re.IGNORECASE
            ),
        )
    for key in ("strength", "value"):
        value = str(attrs.get(key, ""))
        match = re.fullmatch(r"(\d+(?:[.,]\d+)?)(\s*[a-zA-Zµμ/]+)?", value)
        if match and value in claim:
            changed = str(round(float(match[1].replace(",", ".")) + 7, 2)).removesuffix(".0")
            changed += match[2] or ""
            yield (
                "dose_change" if key == "strength" else "number_change",
                claim.replace(value, changed, 1),
            )
    date = fact.get("eventDate")
    if date and date in claim:
        yield "date_shift", claim.replace(date, str(int(date[:4]) + 2) + date[4:], 1)
    elif date and len(date) == 10:
        from datetime import date as iso_date

        day = iso_date.fromisoformat(date)
        rendered = f"{day.day} {day.strftime('%b')} {day.year}"
        if rendered in claim:
            yield (
                "date_shift",
                claim.replace(rendered, f"{day.day} {day.strftime('%b')} {day.year + 2}", 1),
            )
            yield (
                "date_typo",
                claim.replace(rendered, f"{day.day % 28 + 1} {day.strftime('%b')} {day.year}", 1),
            )
    if fact["assertion"] == "negated" and claim.startswith("No "):
        yield "assertion_flip", claim[3:]
    elif fact["assertion"] == "present" and fact["kind"] in {"diagnosis", "symptom", "allergy"}:
        yield "assertion_flip", "No " + claim
    if fact["temporalStatus"] == "planned" and claim.startswith("Planned: "):
        yield "timing_flip", "Completed: " + claim[len("Planned: ") :]


def passage_for(document, fact):
    start, end = fact["start"], fact["end"]
    utf16 = document["text"].encode("utf-16-le")
    if not (0 <= start < end <= len(utf16) // 2):
        raise ValueError("Invalid fact span")
    if utf16[start * 2 : end * 2].decode("utf-16-le") != fact["quote"]:
        raise ValueError("Fact quote does not match final normalised document")
    segments = document["segments"]
    matched = [i for i, seg in enumerate(segments) if seg["start"] < end and seg["end"] > start]
    if not matched:
        raise ValueError("Fact has no overlapping segment")
    lo, hi = matched[0], matched[-1]
    return {
        "text": "\n".join(seg["text"] for seg in segments[lo : hi + 1]),
        "section": segments[lo]["section"],
        "before": [seg["text"] for seg in segments[max(0, lo - 1) : lo]],
        "after": [seg["text"] for seg in segments[hi + 1 : hi + 2]],
        "documentDate": document.get("date", document.get("docDate")),
    }


def patient_examples(row, family, prepared):
    documents = {doc["id"]: doc for doc in prepared["documents"]}
    facts = prepared["facts"]
    for fact in facts:
        if fact.get("support", "supported") != "supported":
            continue
        document = documents[fact["documentId"]]
        passage = passage_for(document, fact)
        base = {
            "patientId": row["patient"]["id"],
            "family": family,
            "documentId": fact["documentId"],
            "start": fact["start"],
            "end": fact["end"],
            "quoteHash": digest(fact["quote"]),
            "factId": fact["id"],
            "assertion": fact["assertion"],
            "timing": fact["temporalStatus"],
            "source": "synthetic",
            "passages": [passage],
        }
        yield {**base, "claim": fact["claim"], "label": "supported", "mutation": "none"}
        for mutation, claim in perturbations(fact["claim"], fact):
            yield {**base, "claim": claim, "label": "contradicted", "mutation": mutation}
        # An unrelated, explicitly absent novel concept is an unsupported assertion,
        # not proof of its negation. The concept is checked against all shown context.
        additions = (
            ("The patient underwent xenon isotope scintigraphy.", ("xenon", "szintig", "scintig")),
            ("A cochlear implant was inserted.", ("cochle", "hörimplant")),
            ("A liver transplant was completed.", ("leber", "liver", "transplant")),
            (
                "The patient uses a ventricular assist device.",
                ("ventrik", "ventric", "assist", "vad"),
            ),
            ("Haemodialysis is ongoing.", ("dialys", "dialys")),
            ("A tracheostomy was performed.", ("trache",)),
        )
        extra, terms = additions[int(digest(fact["id"])[:8], 16) % len(additions)]
        shown = json.dumps(passage).lower()
        if not any(term in shown for term in terms):
            yield {
                **base,
                "claim": fact["claim"] + " " + extra,
                "label": "unsupported",
                "mutation": "unsupported_addition",
            }
        # Cross-domain wrong-passage examples remove the appended-sentence shortcut.
        alternatives = [
            other
            for other in facts
            if other["documentId"] != fact["documentId"]
            and other["kind"] != fact["kind"]
            and other["labelEn"] != fact["labelEn"]
        ]
        for other in alternatives:
            other_doc = documents[other["documentId"]]
            other_passage = passage_for(other_doc, other)
            shown = json.dumps(other_passage, ensure_ascii=False).lower()
            anchors = [
                fact["labelEn"],
                fact["attrs"].get("conceptDe"),
                fact["attrs"].get("generic"),
                fact["attrs"].get("brand"),
            ]
            if any(anchor and str(anchor).lower() in shown for anchor in anchors):
                continue
            if fact["kind"] not in {"medication", "histology", "receptor", "staging"}:
                continue
            if other["kind"] not in {"measurement", "lab", "demographic"}:
                continue
            yield {
                **base,
                "claim": fact["claim"],
                "passages": [other_passage],
                "documentId": other["documentId"],
                "start": other["start"],
                "end": other["end"],
                "quoteHash": digest(other["quote"]),
                "factId": other["id"],
                "assertion": other["assertion"],
                "timing": other["temporalStatus"],
                "label": "unsupported",
                "mutation": "wrong_passage",
            }
            break
        # Recorded mutations are usable only when the final passage contains the
        # mutated value and an English claim actually carries that value.
        for mutation in row["labels"].get("mutations", []):
            if mutation.get("factId") != fact["id"]:
                continue
            final, original = mutation["mutated"], mutation["original"]
            if final != original and final in fact["quote"] and final in fact["claim"]:
                claim = fact["claim"].replace(final, original, 1)
                yield {
                    **base,
                    "claim": claim,
                    "label": "contradicted",
                    "mutation": mutation["type"],
                }


def balanced(rows, limit, seed):
    groups = {label: [] for label in LABELS}
    seen = set()
    for row in rows:
        key = digest(json.dumps([row["claim"], row["passages"]], sort_keys=True))
        if key not in seen:
            groups[row["label"]].append(row)
            seen.add(key)
    size = min([len(group) for group in groups.values()] + [limit // 3])
    rng = random.Random(seed)
    result = []
    for group in groups.values():
        rng.shuffle(group)
        result.extend(group[:size])
    rng.shuffle(result)
    return result


def remove_prompt_overlap(groups):
    reserved = set()
    removed = Counter()
    for split in ("test", "valid", "train"):
        unique = []
        for row in groups[split]:
            key = digest(json.dumps([row["claim"], row["passages"]], sort_keys=True))
            if key in reserved:
                removed[split] += 1
            else:
                unique.append(row)
        groups[split] = unique
        reserved.update(
            digest(json.dumps([row["claim"], row["passages"]], sort_keys=True)) for row in unique
        )
    return dict(removed)


def chat_row(row):
    target = {key: row[key] for key in ("label", "assertion", "timing")}
    return {
        "messages": messages(row["claim"], row["passages"])
        + [{"role": "assistant", "content": json.dumps(target)}],
        "metadata": {key: value for key, value in row.items() if key not in ("claim", "passages")},
    }


def build(sources, out, limit=5001, seed=37):
    groups = defaultdict(list)
    seen_patients = set()
    manifests = []
    all_heldout = set()
    skipped = Counter()
    patient_groups = {}
    source_snapshots = []
    with Bridge() as bridge:
        for source in sources:
            manifest_path = source / "manifest.json"
            if not manifest_path.exists() and (source.parent / "sample/manifest.json").exists():
                manifest_path = source.parent / "sample/manifest.json"
            manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
            manifests.append(
                {
                    "path": str(source.relative_to(ROOT))
                    if source.is_relative_to(ROOT)
                    else str(source),
                    "sha256": digest(json.dumps(manifest, sort_keys=True)),
                }
            )
            heldout = set(
                manifest.get(
                    "heldOutMutationTypes", manifest.get("held_out_mutation_types", DEFAULT_HELDOUT)
                )
            )
            all_heldout.update(heldout)
            held_families = manifest.get("heldOutFamilies", manifest.get("held_out_families", []))
            held_styles = set(manifest.get("heldOutStyles", []))
            held_scenarios = set(manifest.get("heldOutScenarios", []))
            for row, family, declared in source_rows(source):
                patient = row["patient"]["id"]
                if patient in seen_patients:
                    continue
                seen_patients.add(patient)
                split = family_split(family, held_families)
                declared = "valid" if declared in ("val", "validation") else declared
                if declared in ("valid", "test"):
                    split = declared
                if any(part in held_styles | held_scenarios for part in family.split(":")):
                    split = "test"
                if any(
                    value["family"] == family and value["split"] != split
                    for value in patient_groups.values()
                ):
                    raise ValueError(f"Generation family crosses source splits: {family}")
                patient_groups[patient] = {"family": family, "split": split}
                prepared = bridge.call(op="patient", row=row)
                source_snapshots.append(
                    {
                        "patientId": patient,
                        "family": family,
                        "prepared": prepared,
                        "sourceRowSha256": digest(json.dumps(row, sort_keys=True)),
                    }
                )
                for example in patient_examples(row, family, prepared):
                    if split != "test" and example["mutation"] in heldout:
                        skipped["heldout_mutation"] += 1
                        continue
                    groups[split].append(example)
                if all(
                    len(groups[name]) >= cap * 3
                    for name, cap in (("train", limit), ("valid", 600), ("test", 900))
                ):
                    break
    out.mkdir(parents=True, exist_ok=True)
    write_jsonl(out / "source-snapshots.jsonl", source_snapshots)
    overlap_removed = remove_prompt_overlap(groups)
    counts = {}
    for name, cap in (("train", limit), ("valid", 600), ("test", 900)):
        rows = balanced(groups[name], cap, seed)
        write_jsonl(out / f"{name}.jsonl", map(chat_row, rows))
        write_jsonl(out / f"{name}.examples.jsonl", rows)
        counts[name] = {
            "rows": len(rows),
            "labels": dict(Counter(r["label"] for r in rows)),
            "patients": len({r["patientId"] for r in rows}),
            "families": sorted({r["family"] for r in rows}),
            "mutations": dict(Counter(r["mutation"] for r in rows)),
        }
    report = {
        "seed": seed,
        "sources": manifests,
        "splits": counts,
        "skipped": dict(skipped),
        "assignment": patient_groups,
        "labelTier": "intended + final-span-checked; not human gold",
        "heldOutMutationTypes": sorted(all_heldout),
        "exactPromptOverlapRemoved": overlap_removed,
    }
    (out / "manifest.json").write_text(json.dumps(report, indent=2))
    (VERIFIER_DIR / "DATASET.md").write_text(
        "# Verifier dataset\n\nSources: "
        + ", ".join(f"`{source['path']}`" for source in manifests)
        + f". Sampling seed: {seed}. Input manifest hashes are recorded in datasets/manifest.json.\n\n"
        "Synthetic final-document facts rendered with engine templates; "
        "German source segments, section headings and immediate neighbours. Labels are intended "
        "plus exact-span checked, not independently verified or human gold. No real-patient text "
        "is used for training.\n\n```json\n" + json.dumps(counts, indent=2) + "\n```\n\n"
        "Patients and generation families are assigned before augmentation by SHA-256 of family. "
        "Source-declared validation/test patients are never moved into training. Manifest held-out "
        "styles, scenarios, families and mutation types are honoured. Held-out mutation types: "
        + ", ".join(sorted(all_heldout))
        + ". "
        "Source manifests and assignments are recorded in datasets/manifest.json. "
        "Repeated sample/shard patients and exact input duplicates across splits are removed. "
        "Prepared documents/facts and original-row hashes are frozen in source-snapshots.jsonl "
        "so concurrent source rewrites cannot invalidate span checks. "
        "Test inputs take precedence over validation, then training. "
        "Each split is downsampled to equal classes.\n\n"
        "Supported claims come from final facts. Contradictions change explicit numeric, side, "
        "assertion or timing fields; unsupported additions assert a concept absent from the displayed "
        "context. This narrow perturbation distribution is a limitation and may inflate performance. "
        "No claim of clinical generalisation is justified. Dataset files and real-patient exports "
        "are ignored by git. Real cached letter claims are test-only weak labels, never gold.\n"
    )
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, action="append")
    parser.add_argument("--out", type=Path, default=VERIFIER_DIR / "datasets")
    parser.add_argument("--train-limit", type=int, default=5001)
    args = parser.parse_args()
    if args.train_limit < 3:
        parser.error("train-limit must allow at least one example per class")
    sources = args.source or [ROOT / "ml/data/sample", ROOT / "ml/data/synth-v1"]
    if not any(source.exists() for source in sources):
        raise SystemExit("Synthetic sources have not arrived; no dataset was fabricated")
    print(json.dumps(build(sources, args.out, args.train_limit), indent=2))


if __name__ == "__main__":
    main()
