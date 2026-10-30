import copy

from synth.normalise import normalise
from synth.render import render_patient
from synth.rewrite import apply_rewrite, rewrite_candidates
from synth.validate import validate_patient


def test_rewrite_relocates_facts_findings_and_mutations():
    record = render_patient(0)
    original = copy.deepcopy(record)
    response = [
        {"id": row["id"], "text": "Dokumentiert: " + row["text"]}
        for row in rewrite_candidates(record)
    ]
    rewritten, stats = apply_rewrite(record, response)
    assert stats["documentsRewritten"] > 0
    assert rewritten["generation"]["rewritten"]
    assert record == original
    validate_patient(rewritten)
    assert rewritten["generation"]["split"] == original["generation"]["split"]
    assert rewritten["generation"]["family"] == original["generation"]["family"]
    before_rows = [f["quote"] for f in original["labels"]["facts"] if f["kind"] == "medication"]
    after_rows = [f["quote"] for f in rewritten["labels"]["facts"] if f["kind"] == "medication"]
    assert before_rows == after_rows
    assert [m["mutated"] for m in original["labels"]["mutations"]] == [
        m["mutated"] for m in rewritten["labels"]["mutations"]
    ]


def test_bad_value_keeps_whole_document_template():
    record = render_patient(0)
    candidates = rewrite_candidates(record)
    response = [{"id": row["id"], "text": row["text"]} for row in candidates]
    response[0]["text"] += " 999 mg."
    rewritten, stats = apply_rewrite(record, response)
    assert rewritten["documents"][0] == record["documents"][0]
    assert stats["documentsRejected"] >= 1
    validate_patient(rewritten)


def test_no_changed_negation_or_clinical_phrase():
    record = render_patient(0)
    candidates = rewrite_candidates(record)
    response = [{"id": row["id"], "text": row["text"]} for row in candidates]
    response[0]["text"] = "Kein " + response[0]["text"]
    rewritten, stats = apply_rewrite(record, response)
    assert rewritten["documents"][0] == record["documents"][0]
    assert stats["documentsRejected"] >= 1


def test_malformed_response_cannot_delete_documents():
    record = render_patient(0)
    for response in ([], [{"id": "missing", "text": "unrelated"}], [None]):
        rewritten, _ = apply_rewrite(record, response)
        assert rewritten == record


def test_preserved_number_cannot_be_assigned_to_another_lab():
    record = render_patient(1)
    candidates = rewrite_candidates(record)
    response = [
        {"id": row["id"], "text": row["text"].replace("Kreatinin", "Natrium")} for row in candidates
    ]
    rewritten, stats = apply_rewrite(record, response)
    assert rewritten["documents"][0] == record["documents"][0]
    assert stats["documentsRejected"] >= 1


def test_rewrite_keeps_raw_line_breaks_and_entities():
    record = render_patient(0)
    response = [
        {"id": row["id"], "text": "Dokumentiert: " + row["text"]}
        for row in rewrite_candidates(record)
    ]
    rewritten, _ = apply_rewrite(record, response)
    assert "<BR>" in rewritten["documents"][0]["text"]
    assert "&gt;" in rewritten["documents"][0]["text"]
    assert "> 500" in normalise(rewritten["documents"][0]["text"])
