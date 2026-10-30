"""Add v2 statistics to existing pilot predictions without rerunning or tuning any model."""

import argparse
import json

from .common import VERIFIER_DIR, read_jsonl
from .evaluate import input_hash
from .evaluate_v2 import export_errors, summary
from .integrity import file_hash


def summarize():
    result_path = VERIFIER_DIR / "results.json"
    report = json.loads(result_path.read_text())
    data = VERIFIER_DIR / "datasets"
    if file_hash(data / "test.examples.jsonl") != report["evaluationIdentity"]["testSha256"]:
        raise ValueError("Pilot test identity differs from recorded results")
    artifact_dir = VERIFIER_DIR / "runs/pilot-statistics-v2"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    for suite, source in (
        ("synthetic_heldout_families", "test"),
        ("real_patient_weak_labels", "real"),
    ):
        examples = list(read_jsonl(data / f"{source}.examples.jsonl"))
        by_hash = {input_hash(row): row for row in examples}
        for method in report["sets"][suite]:
            values = list(read_jsonl(data / f"predictions-{suite}-{method}.jsonl"))
            if any(row["inputHash"] not in by_hash for row in values):
                raise ValueError("Prediction not found in recorded pilot inputs")
            values = [
                {**row, "patientId": by_hash[row["inputHash"]].get("patientId")} for row in values
            ]
            updated = summary(values)
            # A metric mismatch means the source prediction artifact is stale.
            if abs(updated["macroF1"] - report["sets"][suite][method]["macroF1"]) > 1e-10:
                raise ValueError("Stored pilot scores and prediction rows differ")
            report["sets"][suite][method] = updated
            report.setdefault("errorAnalysis", {}).setdefault(suite, {})[method] = export_errors(
                examples, values, artifact_dir / f"errors-{suite}-{method}.jsonl"
            )
            if suite == "synthetic_heldout_families":
                heldout = set(report["evaluationIdentity"]["heldOutMutationTypes"])
                report["sets"]["heldout_mutation_types"][method] = summary(
                    [row for row in values if row["mutation"] in heldout]
                )
    report.update(
        version=2,
        status="pilot_v1_predictions_reanalysed_no_retraining",
        v2TrainingStatus="pending GPU-enabled orchestrator run",
        cascadeStatus="unmeasured; no validation policy fitted",
    )
    report["evaluationIdentity"]["datasetVersion"] = 1
    manifest = json.loads((VERIFIER_DIR / "runs/data-v2/manifest.json").read_text())
    report["v2DataStatus"] = {
        "splits": manifest["splits"],
        "rewrittenPatientsAvailable": manifest["rewrittenPatientsAvailable"],
        "rewrittenPatientsTarget": manifest["rewrittenPatientsTarget"],
        "frozenTests": manifest["frozenTests"],
    }
    report["realRuleSet"] = {
        key: value
        for key, value in json.loads((VERIFIER_DIR / "real-gold-manifest.json").read_text()).items()
        if key != "references"
    }
    result_path.write_text(json.dumps(report, indent=2) + "\n")
    from .report import write_markdown

    write_markdown(report, VERIFIER_DIR / "results.md")
    return {"status": report["status"], "version": 2}


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    print(json.dumps(summarize()))


if __name__ == "__main__":
    main()
