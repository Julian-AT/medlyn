import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from synth.catalog import HELD_MUTATIONS, HELD_STYLES, MUTATIONS
from synth.generate import generate
from synth.materialise import find_patient, materialise
from synth.normalise import checked_tokens, missing_tokens, normalise, schedule_checks, span_text
from synth.render import Renderer, add_mutations, render_patient
from synth.validate import scan_challenge, validate_patient

ROOT = Path(__file__).resolve().parents[2]


def test_determinism_and_seed():
    assert render_patient(42, 5) == render_patient(42, 5)
    assert render_patient(42, 5) != render_patient(42, 6)
    assert render_patient(42, 5)["patient"]["id"] == "synth-000042"


@pytest.mark.parametrize("index", range(100))
def test_every_label_is_located(index):
    record = render_patient(index)
    counts = validate_patient(record)
    assert counts["facts"] >= 15
    assert counts["distractors"] >= 4


def test_validation_rejects_corrupted_label():
    record = render_patient(0)
    record["labels"]["facts"][0]["end"] += 1
    with pytest.raises(AssertionError, match="Quote mismatch"):
        validate_patient(record)


@pytest.mark.parametrize("mutation_type", MUTATIONS)
def test_mutations_have_incompatible_source_passages(mutation_type):
    labels = {key: [] for key in ("facts", "mutations", "contradictions")}
    r = Renderer("test", "test-d0", labels)
    add_mutations(r, [mutation_type], {"heightCm": 180, "weightKg": 81}, "2020-06-12")
    text = normalise(r.raw())
    mutation = labels["mutations"][0]
    assert span_text(text, mutation["start"], mutation["end"]) == mutation["mutated"]
    assert mutation["original"] in text
    assert mutation["mutated"] != mutation["original"]
    assert labels["contradictions"][0]["id"] == mutation["contradictionId"]
    if mutation_type == "side_flip":
        assert "links" in mutation["original"] and "rechts" in mutation["mutated"]
    elif mutation_type == "dose_change":
        assert "25 mg" in mutation["original"] and "50 mg" in mutation["mutated"]
    elif mutation_type == "schedule_change":
        assert "1 0 0 0" in mutation["original"] and "0 0 1 0" in mutation["mutated"]
    elif mutation_type == "date_shift":
        assert "12.06.2020" in mutation["original"] and "13.06.2020" in mutation["mutated"]
    elif mutation_type == "date_typo":
        assert "20207" in mutation["mutated"]
    elif mutation_type == "assertion_flip":
        assert labels["facts"][1]["assertion"] == "negated"
    else:
        assert "32,0" in mutation["mutated"]


def test_distractors_are_real_and_not_contradictions():
    record = render_patient(0)
    distractors = record["labels"]["distractors"]
    assert {d["type"] for d in distractors} == {
        "change_over_time",
        "measurement_variation",
        "omission",
    }
    for distractor in distractors:
        assert distractor["passages"][0]["documentId"] != distractor["passages"][1]["documentId"]
        assert distractor["id"] not in {c["id"] for c in record["labels"]["contradictions"]}


def test_normalisation_and_utf16():
    assert normalise("A<BR>b<br />&gt;&#228;&#x1f600;&unknown;&#0;") == "A\nb\n>ä😀&unknown;&#0;"
    assert span_text("😀äabc", 2, 4) == "äa"
    assert normalise("&GT;") == "&GT;"


def test_checked_tokens_and_ordered_schedule():
    fields = {
        "nested": {
            "date": "2020-06-12",
            "side": "left",
            "dose": "0.5 mg",
            "schedule": ["1", "0", "1/2", "0"],
        }
    }
    passage = "Am 12.06.2020: links, 0,5 mg, Einnahme 1 0 ½ 0 ST."
    assert not missing_tokens(fields, passage)
    assert schedule_checks(fields, passage)
    assert not schedule_checks(fields, passage.replace("1 0 ½ 0", "0 1 ½ 0"))
    assert checked_tokens({"x": "HER2 0; cT2 N0 M0; 100 IE/ml"}) == {"2", "0", "100ie"}


def test_shards_index_and_family_split(tmp_path):
    manifest = generate(30, tmp_path, shard_size=7)
    assert manifest["splits"] == {"train": 24, "val": 3, "test": 3}
    families = {}
    for line in (tmp_path / "index.jsonl").read_text().splitlines():
        entry = json.loads(line)
        assert families.setdefault(entry["family"], entry["split"]) == entry["split"]
        record = find_patient(tmp_path, entry["patientId"])
        validate_patient(record)
        if entry["split"] != "test":
            assert record["generation"]["style"] not in HELD_STYLES
            assert not set(record["generation"]["mutationTypes"]) & set(HELD_MUTATIONS)
    with pytest.raises(FileExistsError):
        generate(1, tmp_path)


@pytest.mark.parametrize("index", [0, 7, 17, 25, 29, 49])
def test_materialised_patient_loads_in_real_engine(tmp_path, index):
    if not shutil.which("node") or not (ROOT / "node_modules").exists():
        pytest.skip("Node workspace dependencies are absent")
    record = render_patient(index)
    materialise(record, tmp_path)
    script = """
import { loadCorpus } from './packages/engine/ingest/corpus.ts';
import { readFileSync } from 'node:fs';
import { locate } from './packages/engine/ingest/locate.ts';
import { contentHash, factId } from './packages/engine/ingest/hash.ts';
const corpus = loadCorpus(process.argv[1]);
const labels = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const fact of labels.facts) {
  const doc = corpus.documents.find(d => d.doc.id === fact.documentId);
  const source = doc.segments.find(s => s.start <= fact.start && s.end >= fact.end);
  if (!source) throw new Error(`Fact spans engine segments: ${fact.id}`);
  if (fact.segmentId !== `${fact.documentId}-s${source.ordinal}` ||
    fact.contentHash !== contentHash(fact) || fact.id !== factId(fact.contentHash))
    throw new Error(`Invalid content identity: ${fact.id}`);
  const result = locate(fact.quote, source,
    {labelEn:fact.labelEn, attrs:fact.attrs, eventDate:fact.eventDate, dueDate:fact.dueDate});
  if (!result.ok || result.start !== fact.start || result.end !== fact.end)
    throw new Error(JSON.stringify({fact:fact.id, result}));
}
console.log(JSON.stringify({documents:corpus.documents.length, facts:labels.facts.length}));
"""
    labels_path = tmp_path / "labels.json"
    labels_path.write_text(json.dumps(record["labels"]))
    result = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--input-type=module",
            "-e",
            script,
            str(tmp_path),
            str(labels_path),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["documents"] == len(record["documents"])


def test_no_challenge_windows_in_generator():
    configured = os.environ.get("MEDLYN_DATA_PATH")
    if not configured and (ROOT / ".env").exists():
        for line in (ROOT / ".env").read_text().splitlines():
            if line.startswith("MEDLYN_DATA_PATH="):
                configured = line.partition("=")[2].strip().strip("\"'")
    data = (
        ROOT / (configured or "TRACK-1-clinical-documentation/data/patient-0000-0001")
    ).resolve()
    if not (data / "documents").exists():
        pytest.skip("Challenge data absent")
    assert scan_challenge([ROOT / "ml/synth", ROOT / "ml/data/sample"], data)["overlaps"] == 0
