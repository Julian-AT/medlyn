"""Export aggregate evidence only; protected held-out scores require an explicit opt-in."""

import argparse
import hashlib
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PENDING = r"\textit{pending}"


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value if math.isfinite(value) and value >= 0 else None


def integer(value):
    value = number(value)
    return int(value) if value is not None and int(value) == value else None


def ratio(numerator, denominator):
    if number(numerator) is None or number(denominator) in (None, 0):
        return None
    return 100 * numerator / denominator if numerator <= denominator else None


def formatted(value):
    if value is None:
        return PENDING
    if isinstance(value, int):
        return f"{value:,}"
    return f"{value:.2f}"


class Evidence:
    def __init__(self, root):
        self.root = root
        self.sources = []
        self.warnings = []

    def read(self, relative, text=False):
        path = self.root / relative
        if not path.is_file():
            return None
        content = path.read_bytes()
        source = {"path": relative, "sha256": hashlib.sha256(content).hexdigest()}
        try:
            value = content.decode() if text else json.loads(content)
        except (ValueError, UnicodeError):
            self.warnings.append(f"Invalid input: {relative}")
            return None
        if not text and not isinstance(value, dict):
            self.warnings.append(f"Expected an object: {relative}")
            return None
        self.sources.append(source)
        return value

    def first(self, relatives):
        for path in relatives:
            result = self.read(path)
            if isinstance(result, dict):
                return result
        return {}


def valid_rows(report):
    if not isinstance(report, dict) or report.get("mode") != "live":
        return []
    rows = report.get("rows", [])
    if not isinstance(rows, list) or not rows:
        return []
    # A duplicate question or a labelled mock capture invalidates the whole aggregate.
    if any(not isinstance(row, dict) or not isinstance(row.get("id"), str)
           or not isinstance(row.get("pass"), bool)
           or (row.get("capture") or {}).get("mock") is True for row in rows):
        return []
    return rows if len({row["id"] for row in rows}) == len(rows) else []


def nested_count(record, *keys):
    for key in keys:
        if isinstance(record, dict) and integer(record.get(key)) is not None:
            return integer(record[key])
    return None


def collect(root=ROOT, include_heldout=False):
    evidence = Evidence(root)
    metrics = {}
    protocol = evidence.read("paper/protocol.json") or {}
    protocol_names = {
        "RegressionTarget": "regression_questions", "SituationCount": "regression_situations",
        "HeldoutTarget": "heldout_situations", "SynthTarget": "synthetic_patients_target",
        "ChallengeMinimum": "synthetic_challenges_minimum",
        "FirstCardTarget": "first_card_target_seconds", "ColdTarget": "cold_target_seconds",
        "CachedTarget": "cached_target_seconds", "ChallengeLimit": "challenge_limit_seconds",
    }
    metrics.update({name: number(protocol.get(key)) for name, key in protocol_names.items()})
    results = evidence.read("eval/output/results.json") or {}
    regression = evidence.read("eval/output/regression.json")
    rows = valid_rows(results) or valid_rows(regression)
    if valid_rows(results) and regression and results.get("rows") != regression.get("rows"):
        evidence.warnings.append("Standalone regression differs from results.json; using the complete result bundle without merging runs.")
    for name in ("RegressionPassed", "RegressionTotal", "SuitePassed", "ColdMaxSeconds",
                 "WarmMaxSeconds", "CachedMaxSeconds", "TimingCount", "CacheHits",
                 "TraceChecked", "TraceViolations", "ComposedChecked", "ComposedFailures",
                 "ContradictionsFound", "ClarificationsFound", "FalseAlarms", "BrowserPassed"):
        metrics[name] = None
    if rows:
        metrics["RegressionPassed"] = sum(row["pass"] for row in rows)
        metrics["RegressionTotal"] = len(rows)
        if all(isinstance(row.get("suitePass"), bool) for row in rows):
            metrics["SuitePassed"] = sum(row["suitePass"] for row in rows)
    # Audit/timing metadata must come from the same scored rows, not a stale second run.
    same_run = rows and results.get("mode") == "live" and results.get("rows") == rows
    if same_run:
        timings = results.get("timings", [])
        cold = [number(t.get("coldMs")) for t in timings]
        warm = [number(t.get("warmMs")) for t in timings]
        cached = [number(t.get("warmMs")) for t in timings if t.get("cached") is True]
        if timings and all(t is not None for t in cold):
            metrics["ColdMaxSeconds"] = max(cold) / 1000
            metrics["TimingCount"] = len(cold)
        if timings and all(t is not None for t in warm):
            metrics["WarmMaxSeconds"] = max(warm) / 1000
        if cached and all(t is not None for t in cached):
            metrics["CachedMaxSeconds"] = max(cached) / 1000
        if timings and all(isinstance(t.get("cached"), bool) for t in timings):
            metrics["CacheHits"] = sum(t["cached"] for t in timings)
        audits = list(results.get("audits", {}).values())
        for kind, count_name, fail_name in (("traceability", "TraceChecked", "TraceViolations"),
                                            ("composed", "ComposedChecked", "ComposedFailures")):
            if audits and all(a.get("status") == "measured" and isinstance(a.get(kind), dict)
                              and integer(a[kind].get("checked")) is not None
                              and isinstance(a[kind].get("failures"), list) for a in audits):
                metrics[count_name] = sum(a[kind]["checked"] for a in audits)
                metrics[fail_name] = sum(len(a[kind]["failures"]) for a in audits)
        findings = results.get("findings", {})
        matched = findings.get("matched", [])
        if matched and all(isinstance(m.get("found"), bool) for m in matched):
            metrics["ContradictionsFound"] = sum(m["found"] and m.get("category") == "contradiction" for m in matched)
            metrics["ClarificationsFound"] = sum(m["found"] and m.get("category") == "needs_clarification" for m in matched)
            if isinstance(findings.get("falseAlarmIds"), list):
                metrics["FalseAlarms"] = len(findings["falseAlarmIds"])
    # A failed browser launch is not a measured answer-visibility failure rate.
    browser = evidence.read("eval/output/playwright.json") or {}
    stats = browser.get("stats", {})
    if stats.get("unexpected") == 0 and integer(stats.get("expected")) not in (None, 0):
        metrics["BrowserPassed"] = stats["expected"]
    for tier in (1, 2, 3):
        for suffix in ("Count", "Relevance", "Grounding"):
            metrics[f"Tier{tier}{suffix}"] = None
    if include_heldout:
        heldout = valid_rows(evidence.read("eval/output/heldout.json"))
        for tier in (1, 2, 3):
            selected = [r for r in heldout if r.get("tier") == tier]
            if selected:
                metrics[f"Tier{tier}Count"] = len(selected)
                for metric in ("relevance", "grounding"):
                    scores = [r.get("namedScores", {}).get(metric) for r in selected]
                    if all(s in (0, 1) for s in scores):
                        metrics[f"Tier{tier}{metric.title()}"] = sum(s == 1 for s in scores)
    else:
        evidence.warnings.append("Held-out results not opened: pass --include-heldout only after the H+7 review.")
    ingest = evidence.first(("eval/output/ingest-summary.json", "packages/engine/ingest/summary.json"))
    for name, keys in {"DocumentCount": ("documents", "documentCount"),
                       "SegmentCount": ("segments", "segmentCount"),
                       "FactCount": ("facts", "factCount"),
                       "CoverageMatched": ("coverageMatched",),
                       "CoverageTotal": ("coverageTotal",)}.items():
        metrics[name] = nested_count(ingest, *keys)
    if not ingest:
        report = evidence.read(".agents/reports/ingest-llm.md", text=True) or ""
        counts = re.search(r"(\d+) documents, (\d+) translated segments, (\d+) supported facts", report)
        if counts:
            for name, value in zip(("DocumentCount", "SegmentCount", "FactCount"), counts.groups()):
                metrics[name] = int(value)
        coverage = re.search(r"(\d+)/(\d+) unique document/concept hints", report)
        if coverage:
            metrics["CoverageMatched"], metrics["CoverageTotal"] = map(int, coverage.groups())
        evidence.warnings.append("Ingestion counts use the prior lane summary when JSON is absent; no new ingest was run.")
    metrics["CoveragePercent"] = ratio(metrics["CoverageMatched"], metrics["CoverageTotal"])
    synth = evidence.first(("ml/data/synth-v1/manifest.json", "ml/synth/manifest.json"))
    counts = synth.get("counts", {})
    for name, keys in {"SynthPatients": ("patients", "patientCount", "nPatients"),
                       "SynthDocuments": ("documents", "documentCount", "nDocuments")}.items():
        metrics[name] = nested_count(counts, *keys)
        if metrics[name] is None:
            metrics[name] = nested_count(synth, *keys)
    verifier = evidence.read("ml/verifier/results.json") or {}
    sample = evidence.read("ml/data/sample/manifest.json") or {}
    metrics["SynthSamplePatients"] = nested_count(sample.get("counts", sample), "patients", "nPatients")
    metrics["SynthSampleDocuments"] = nested_count(sample.get("counts", sample), "documents")
    # Only explicit aggregate metrics are copied. Never export free text or predictions.
    aliases = {"VerifierMacroFone": ("macroF1", "macro_f1"),
               "VerifierAccuracy": ("accuracy",), "VerifierLatencyMs": ("latencyMs", "median_latency_ms")}
    for name, keys in aliases.items():
        metrics[name] = next((number(verifier[k]) for k in keys if number(verifier.get(k)) is not None), None)
    dataset = evidence.read("ml/verifier/datasets/manifest.json") or {}
    methods = {"Rules": "rules_only", "Proxy": "proxy_fast", "Local": "local_qlora"}
    heldout_verifier = verifier.get("sets", {}).get("synthetic_heldout_families", {})
    for label, method in methods.items():
        result = heldout_verifier.get(method, {})
        measured = integer(result.get("n")) not in (None, 0)
        metrics[f"{label}VerifierN"] = integer(result.get("n")) if measured else None
        metrics[f"{label}VerifierFscore"] = number(result.get("macroF1")) if measured else None
        metrics[f"{label}VerifierCoverage"] = number(result.get("coverage")) if measured else None
        metrics[f"{label}VerifierLatency"] = number(result.get("latencyMs", {}).get("p50")) if measured else None
    if metrics["LocalVerifierN"] is not None:
        metrics["VerifierMacroFone"] = metrics["LocalVerifierFscore"]
        metrics["VerifierLatencyMs"] = metrics["LocalVerifierLatency"]
    for split, macro in (("train", "TrainExamples"), ("valid", "ValidationExamples"), ("test", "TestExamples")):
        metrics[macro] = nested_count(dataset.get("splits", {}).get(split, {}), "rows")
    synthetic = evidence.first(("eval/output/synthetic.json", "eval/output/synthetic-results.json"))
    summary = synthetic.get("totals", synthetic.get("summary", {}))
    metrics["SyntheticChallenges"] = nested_count(summary, "measured") if synthetic.get("mode") == "live" else None
    metrics["SyntheticGenerated"] = nested_count(synthetic, "generated")
    retrieval = evidence.first(("eval/output/retrieval.json", "eval/output/retrieval-results.json"))
    metrics["RetrievalRecall"] = next((number(retrieval[k]) for k in ("recallAtK", "recall_at_k")
                                       if number(retrieval.get(k)) is not None), None)
    retrieval_modes = synthetic.get("retrieval", {}).get("modes", [])
    for label, mode in (("Lexical", "bm25"), ("Vector", "vector"), ("Hybrid", "hybrid")):
        result = next((r for r in retrieval_modes if r.get("mode") == mode), {})
        measured = result.get("status") == "measured" and integer(result.get("evaluated")) not in (None, 0)
        metrics[f"{label}RetrievalN"] = integer(result.get("evaluated")) if measured else None
        for suffix, key in (("RecallFive", "recallAt5"), ("RecallTen", "recallAt10"), ("MrrTen", "mrrAt10")):
            metrics[f"{label}{suffix}"] = number(result.get(key)) if measured else None
    if metrics["HybridRecallTen"] is not None:
        metrics["RetrievalRecall"] = metrics["HybridRecallTen"]
    return metrics, evidence


def write_outputs(root=ROOT, include_heldout=False):
    metrics, evidence = collect(root, include_heldout)
    output = root / "paper/generated"
    output.mkdir(parents=True, exist_ok=True)
    def macro_name(name):
        return name.replace("1", "One").replace("2", "Two").replace("3", "Three")
    tex = "% Generated by scripts/numbers.py; do not edit.\n"
    tex += "".join("\\newcommand{" + chr(92) + macro_name(k) + "}{" + formatted(v) + "}\n" for k, v in metrics.items())
    (output / "numbers.tex").write_text(tex)
    (output / "numbers.json").write_text(json.dumps(metrics, indent=2) + "\n")
    provenance = {"sources": evidence.sources, "warnings": evidence.warnings,
                  "heldout_included": include_heldout, "status": "automated; requires human review"}
    (output / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    def table(filename, heading, rows):
        lines = [r"\begin{tabular}{@{}p{.62\linewidth}r@{}}", r"\toprule", heading + " " + chr(92) * 2, r"\midrule"]
        lines += [label + " & " + value + r" \\" for label, value in rows]
        lines += [r"\bottomrule", r"\end{tabular}"]
        (output / filename).write_text("\n".join(lines) + "\n")
    table("evaluation.tex", "Measure & Observed", [
        ("Regression answer and citation passes", r"\RegressionPassed/\RegressionTotal"),
        ("Full-suite question passes", r"\SuitePassed/\RegressionTotal"),
        ("Located fact references checked", r"\TraceChecked"),
        ("Location audit violations", r"\TraceViolations"),
        ("Composed claims independently audited", r"\ComposedChecked"),
        ("Contradiction fixtures recovered", r"\ContradictionsFound"),
        ("Clarification fixtures recovered", r"\ClarificationsFound"),
        ("False alarms against dismissal fixtures", r"\FalseAlarms"),
        ("Slowest cold engine/API request (s)", r"\ColdMaxSeconds"),
        ("Slowest warm attempt (s)", r"\WarmMaxSeconds"),
        ("Confirmed warm cache hits", r"\CacheHits/\TimingCount"),
        ("Slowest confirmed cached request (s)", r"\CachedMaxSeconds"),
        ("Browser checks successfully completed", r"\BrowserPassed"),
    ])
    table("research.tex", "Research artifact & Observed", [
        ("Generated synthetic patients", r"\SynthPatients"),
        ("Generated synthetic documents", r"\SynthDocuments"),
        ("Sample patients / documents", r"\SynthSamplePatients / \SynthSampleDocuments"),
        ("Synthetic challenges generated", r"\SyntheticGenerated"),
        ("Synthetic challenges evaluated", r"\SyntheticChallenges"),
        ("Verifier training / validation / test examples", r"\TrainExamples / \ValidationExamples / \TestExamples"),
        ("Verifier macro F-score", r"\VerifierMacroFone"),
        ("Verifier accuracy", r"\VerifierAccuracy"),
        ("Verifier median latency (ms)", r"\VerifierLatencyMs"),
        ("Retrieval recall at configured cutoff", r"\RetrievalRecall"),
    ])
    table("heldout.tex", "Generalisation tier & Relevance / grounding passes", [
        ("Reworded configured situation", r"\TierOneRelevance{} / \TierOneGrounding{} (\TierOneCount{})"),
        ("New combination of known needs", r"\TierTwoRelevance{} / \TierTwoGrounding{} (\TierTwoCount{})"),
        ("Role without a configured profile", r"\TierThreeRelevance{} / \TierThreeGrounding{} (\TierThreeCount{})"),
    ])
    comparison = [r"\begin{tabular}{@{}lrrrr@{}}", r"\toprule",
                  "Verifier & Examples & Macro F-score & Coverage & Median ms " + chr(92) * 2, r"\midrule"]
    for label, title in (("Rules", "Rules only"), ("Proxy", "Proxy semantic"), ("Local", "Local adapter")):
        comparison.append(title + " & " + " & ".join(chr(92) + label + "Verifier" + suffix
                          for suffix in ("N", "Fscore", "Coverage", "Latency")) + " " + chr(92) * 2)
    comparison.extend((r"\bottomrule", r"\end{tabular}"))
    (output / "verifier.tex").write_text("\n".join(comparison) + "\n")
    retrieval_table = [r"\begin{tabular}{@{}lrrrr@{}}", r"\toprule",
                       "Retrieval & Queries & Recall@$5$ & Recall@$10$ & MRR@$10$ " + chr(92) * 2, r"\midrule"]
    for label, title in (("Lexical", "BM25"), ("Vector", "Vector"), ("Hybrid", "Hybrid")):
        retrieval_table.append(title + " & " + " & ".join(chr(92) + label + suffix
                              for suffix in ("RetrievalN", "RecallFive", "RecallTen", "MrrTen")) + " " + chr(92) * 2)
    retrieval_table.extend((r"\bottomrule", r"\end{tabular}"))
    (output / "retrieval.tex").write_text("\n".join(retrieval_table) + "\n")
    return metrics, evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--include-heldout", action="store_true", help="Only after the H+7 review authorizes opening held-out results")
    args = parser.parse_args()
    metrics, evidence = write_outputs(include_heldout=args.include_heldout)
    print(f"Generated {len(metrics)} macros and 5 tables; {sum(v is None for v in metrics.values())} pending.")
    for warning in evidence.warnings:
        print(warning)


if __name__ == "__main__":
    main()
