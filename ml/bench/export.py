"""Only human-approved numeric aggregates can enter manuscript artifacts."""

import json
import math

from verifier.common import ROOT
from verifier.integrity import file_hash

from .systems import SYSTEMS

SUITES = (
    "synthetic-families",
    "heldout-mutations",
    "rewritten-prose",
    "real-text",
    "aggrefact",
    "synthetic-english",
    "synthetic-families-existing-english",
    "heldout-mutations-existing-english",
    "rewritten-prose-existing-english",
    "real-text-existing-english",
)


def number(value):
    return f"{value:.4f}" if isinstance(value, (float, int)) and math.isfinite(value) else "--"


def export(path, review=None, generated=None):
    report = json.loads(path.read_text())
    approval = json.loads(review.read_text()) if review and review.exists() else {}
    approved = (
        bool(approval.get("reviewedBy", "").strip())
        and approval.get("benchmarkSha256") == file_hash(path)
        and report.get("status") == "measured"
    )
    generated = generated or ROOT / "paper/generated"
    generated.mkdir(parents=True, exist_ok=True)
    rows = [
        r"\begin{tabular}{@{}llrrrrrr@{}}",
        r"\toprule",
        r"Suite & System & N & Macro-F1 & Binary F1 & BAcc & Median ms & ECE \\",
        r"\midrule",
    ]
    reliability = ["suite system lower upper n confidence accuracy"]
    latency = ["suite system n median_ms p95_ms binary_f1"]
    count = 0
    for suite_i, suite in enumerate(SUITES, 1):
        for system_i, system in enumerate(SYSTEMS, 1):
            metrics = report.get("sets", {}).get(suite, {}).get(system)
            if not metrics:
                continue
            count += 1
            cells = [
                number(metrics.get(k)) for k in ("n", "macroF1", "binaryF1", "balancedAccuracy")
            ]
            cells += [number(metrics["latencyMs"]["p50"]), number(metrics["calibration"]["ece"])]
            rows.append(
                f"{suite_i} & {system_i} & "
                + " & ".join(cells if approved else ["--"] * 6)
                + r" \\"
            )
            if approved:
                for b in metrics["binaryCalibration"]["bins"]:
                    if b["n"]:
                        reliability.append(
                            " ".join(
                                number(v)
                                for v in (
                                    suite_i,
                                    system_i,
                                    b["lower"],
                                    b["upper"],
                                    b["n"],
                                    b["confidence"],
                                    b["accuracy"],
                                )
                            )
                        )
                if metrics["latencyMs"]["n"]:
                    latency.append(
                        " ".join(
                            number(v)
                            for v in (
                                suite_i,
                                system_i,
                                metrics["latencyMs"]["n"],
                                metrics["latencyMs"]["p50"],
                                metrics["latencyMs"]["p95"],
                                metrics["binaryF1"],
                            )
                        )
                    )
    if not count:
        rows.append(r"\multicolumn{8}{c}{\textit{pending measured benchmark}} \\")
    rows += [r"\bottomrule", r"\end{tabular}"]
    (generated / "bench_table.tex").write_text("\n".join(rows) + "\n")
    (generated / "bench_reliability.dat").write_text("\n".join(reliability) + "\n")
    (generated / "bench_latency.dat").write_text("\n".join(latency) + "\n")
    return {
        "approved": approved,
        "measuredRows": count,
        "publishedRows": count if approved else 0,
        "benchmarkSha256": file_hash(path),
    }
