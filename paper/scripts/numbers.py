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


def probability(value):
    value = number(value)
    return value if value is not None and value <= 1 else None


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
    if isinstance(value, int) or value.is_integer():
        return f"{value:,.0f}"
    return f"{value:.3f}"


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
    if any(
        not isinstance(row, dict)
        or not isinstance(row.get("id"), str)
        or not isinstance(row.get("pass"), bool)
        or (row.get("capture") or {}).get("mock") is True
        for row in rows
    ):
        return []
    return rows if len({row["id"] for row in rows}) == len(rows) else []


def nested_count(record, *keys):
    for key in keys:
        if isinstance(record, dict) and integer(record.get(key)) is not None:
            return integer(record[key])
    return None


def collect(root=ROOT, include_heldout=False):
    evidence = Evidence(root)
    snapshot = evidence.read("paper/results/submission-results.json")
    if snapshot is not None:
        for path, digest in snapshot.get("dependencyHashes", {}).items():
            if (
                not (root / path).is_file()
                or hashlib.sha256((root / path).read_bytes()).hexdigest() != digest
            ):
                raise ValueError(f"Frozen submission dependency changed: {path}")
            evidence.read(path, text=path.endswith(".md"))
        metrics = snapshot.get("metrics", {})
        if not metrics or any(
            not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*", name) or number(value) is None
            for name, value in metrics.items()
        ):
            raise ValueError("Submission results must contain finite numeric aggregates")
        if include_heldout:
            evidence.warnings.append("Frozen submission excludes challenge blind results.")
        return metrics, evidence
    metrics = {}
    protocol = evidence.read("paper/protocol.json") or {}
    protocol_names = {
        "RegressionTarget": "regression_questions",
        "SituationCount": "regression_situations",
        "HeldoutTarget": "heldout_situations",
        "SynthTarget": "synthetic_patients_target",
        "ChallengeMinimum": "synthetic_challenges_minimum",
        "FirstCardTarget": "first_card_target_seconds",
        "ColdTarget": "cold_target_seconds",
        "CachedTarget": "cached_target_seconds",
        "ChallengeLimit": "challenge_limit_seconds",
        "RetrievalSmallK": "retrieval_small_k",
        "RetrievalLargeK": "retrieval_large_k",
        "SequenceLimit": "verifier_sequence_limit",
        "TrainingMinuteCap": "verifier_minute_cap",
    }
    metrics.update({name: number(protocol.get(key)) for name, key in protocol_names.items()})
    results = evidence.read("eval/output/results.json") or {}
    regression = evidence.read("eval/output/regression.json")
    rows = valid_rows(results) or valid_rows(regression)
    if valid_rows(results) and regression and results.get("rows") != regression.get("rows"):
        evidence.warnings.append(
            "Standalone regression differs from results.json; using the complete result bundle without merging runs."
        )
    for name in (
        "RegressionPassed",
        "RegressionTotal",
        "SuitePassed",
        "ColdMaxSeconds",
        "WarmMaxSeconds",
        "CachedMaxSeconds",
        "TimingCount",
        "CacheHits",
        "TraceChecked",
        "TraceViolations",
        "ComposedChecked",
        "ComposedFailures",
        "ContradictionsFound",
        "ClarificationsFound",
        "FalseAlarms",
        "BrowserPassed",
    ):
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
        for kind, count_name, fail_name in (
            ("traceability", "TraceChecked", "TraceViolations"),
            ("composed", "ComposedChecked", "ComposedFailures"),
        ):
            if audits and all(
                a.get("status") == "measured"
                and isinstance(a.get(kind), dict)
                and integer(a[kind].get("checked")) is not None
                and isinstance(a[kind].get("failures"), list)
                for a in audits
            ):
                metrics[count_name] = sum(a[kind]["checked"] for a in audits)
                metrics[fail_name] = sum(len(a[kind]["failures"]) for a in audits)
        findings = results.get("findings", {})
        matched = findings.get("matched", [])
        if matched and all(isinstance(m.get("found"), bool) for m in matched):
            metrics["ContradictionsFound"] = sum(
                m["found"] and m.get("category") == "contradiction" for m in matched
            )
            metrics["ClarificationsFound"] = sum(
                m["found"] and m.get("category") == "needs_clarification" for m in matched
            )
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
        evidence.warnings.append(
            "Held-out results not opened: pass --include-heldout only after the H+7 review."
        )
    ingest = evidence.first(
        ("eval/output/ingest-summary.json", "packages/engine/ingest/summary.json")
    )
    for name, keys in {
        "DocumentCount": ("documents", "documentCount"),
        "SegmentCount": ("segments", "segmentCount"),
        "FactCount": ("facts", "factCount"),
        "CoverageMatched": ("coverageMatched",),
        "CoverageTotal": ("coverageTotal",),
    }.items():
        metrics[name] = nested_count(ingest, *keys)
    if not ingest:
        report = evidence.read(".agents/reports/ingest-llm.md", text=True) or ""
        counts = re.search(
            r"(\d+) documents, (\d+) translated segments, (\d+) supported facts", report
        )
        if counts:
            for name, value in zip(("DocumentCount", "SegmentCount", "FactCount"), counts.groups()):
                metrics[name] = int(value)
        coverage = re.search(r"(\d+)/(\d+) unique document/concept hints", report)
        if coverage:
            metrics["CoverageMatched"], metrics["CoverageTotal"] = map(int, coverage.groups())
        evidence.warnings.append(
            "Ingestion counts use the prior lane summary when JSON is absent; no new ingest was run."
        )
    metrics["CoveragePercent"] = ratio(metrics["CoverageMatched"], metrics["CoverageTotal"])
    synth = evidence.first(("ml/data/synth-v1/manifest.json", "ml/synth/manifest.json"))
    counts = synth.get("counts", {})
    for name, keys in {
        "SynthPatients": ("patients", "patientCount", "nPatients"),
        "SynthDocuments": ("documents", "documentCount", "nDocuments"),
    }.items():
        metrics[name] = nested_count(counts, *keys)
        if metrics[name] is None:
            metrics[name] = nested_count(synth, *keys)
    for macro, key in (
        ("SynthFacts", "facts"),
        ("SynthContradictions", "contradictions"),
        ("SynthDistractors", "distractors"),
        ("SynthGaps", "gaps"),
    ):
        metrics[macro] = nested_count(counts, key)
    metrics["SynthRewrittenPatients"] = nested_count(synth, "rewrittenPatients")
    verifier = evidence.read("ml/verifier/results.json") or {}
    sample = evidence.read("ml/data/sample/manifest.json") or {}
    metrics["SynthSamplePatients"] = nested_count(
        sample.get("counts", sample), "patients", "nPatients"
    )
    metrics["SynthSampleDocuments"] = nested_count(sample.get("counts", sample), "documents")
    # Only explicit aggregate metrics are copied. Never export free text or predictions.
    aliases = {
        "VerifierMacroFone": ("macroF1", "macro_f1"),
        "VerifierAccuracy": ("accuracy",),
        "VerifierLatencyMs": ("latencyMs", "median_latency_ms"),
    }
    for name, keys in aliases.items():
        metrics[name] = next(
            (
                (number(verifier[k]) if name == "VerifierLatencyMs" else probability(verifier[k]))
                for k in keys
                if number(verifier.get(k)) is not None
            ),
            None,
        )
    dataset = evidence.first(
        ("ml/verifier/runs/data-v2-final/manifest.json", "ml/verifier/datasets/manifest.json")
    )
    methods = {
        "Rules": "rules_only",
        "Proxy": "proxy_fast",
        "Local": "local_qlora",
        "Cascade": "cascade",
    }
    sets = verifier.get("sets", {})
    heldout_verifier = sets.get("synthetic_heldout_families") or sets.get("test", {})
    heldout_verifier = heldout_verifier.get("metrics", heldout_verifier)
    for label, method in methods.items():
        result = heldout_verifier.get(method, {})
        measured = integer(result.get("n")) not in (None, 0)
        metrics[f"{label}VerifierN"] = integer(result.get("n")) if measured else None
        metrics[f"{label}VerifierFscore"] = probability(result.get("macroF1")) if measured else None
        metrics[f"{label}VerifierCoverage"] = (
            probability(result.get("coverage")) if measured else None
        )
        metrics[f"{label}VerifierLatency"] = (
            number(result.get("latencyMs", {}).get("p50")) if measured else None
        )
    if metrics["LocalVerifierN"] is not None:
        metrics["VerifierMacroFone"] = metrics["LocalVerifierFscore"]
        metrics["VerifierLatencyMs"] = metrics["LocalVerifierLatency"]
    for split, macro in (
        ("train", "TrainExamples"),
        ("valid", "ValidationExamples"),
        ("test", "TestExamples"),
    ):
        split_record = dataset.get("splits", {}).get(split, {})
        metrics[macro] = nested_count(split_record, "rows")
        labels = split_record.get("labels", {})
        if (
            metrics[macro] is None
            and labels
            and all(integer(n) is not None for n in labels.values())
        ):
            metrics[macro] = sum(labels.values())
    synthetic = evidence.first(("eval/output/synthetic.json", "eval/output/synthetic-results.json"))
    summary = synthetic.get("totals", synthetic.get("summary", {}))
    metrics["SyntheticChallenges"] = (
        nested_count(summary, "measured") if synthetic.get("mode") == "live" else None
    )
    metrics["SyntheticGenerated"] = nested_count(synthetic, "generated")
    retrieval = evidence.first(("eval/output/retrieval.json", "eval/output/retrieval-results.json"))
    metrics["RetrievalRecall"] = next(
        (
            number(retrieval[k])
            for k in ("recallAtK", "recall_at_k")
            if number(retrieval.get(k)) is not None
        ),
        None,
    )
    retrieval_modes = retrieval.get("modes", []) or retrieval.get("retrieval", {}).get("modes", [])
    if not retrieval_modes:
        retrieval_modes = synthetic.get("retrieval", {}).get("modes", [])
    for label, mode in (("Lexical", "bm25"), ("Vector", "vector"), ("Hybrid", "hybrid")):
        result = next((r for r in retrieval_modes if r.get("mode") == mode), {})
        measured = result.get("status") == "measured" and integer(result.get("evaluated")) not in (
            None,
            0,
        )
        metrics[f"{label}RetrievalN"] = integer(result.get("evaluated")) if measured else None
        for suffix, key in (
            ("RecallFive", "recallAt5"),
            ("RecallTen", "recallAt10"),
            ("MrrTen", "mrrAt10"),
        ):
            metrics[f"{label}{suffix}"] = probability(result.get(key)) if measured else None
    if metrics["HybridRecallTen"] is not None:
        metrics["RetrievalRecall"] = metrics["HybridRecallTen"]
    reviewed = evidence.read("paper/results/challenge-review.json") or {}
    review_sources = reviewed.get("sources", {})
    review_valid = bool(review_sources) and all(
        (root / path).is_file() and hashlib.sha256((root / path).read_bytes()).hexdigest() == digest
        for path, digest in review_sources.items()
    )
    if review_valid:
        for name, value in reviewed.get("metrics", {}).items():
            if re.fullmatch(r"Reviewed[A-Za-z]+", name):
                metrics[name] = number(value)
    elif reviewed:
        evidence.warnings.append("Challenge review source identity changed; summary withheld.")
    quantum = evidence.read("ml/quantum/results.json") or {}
    hardware = quantum.get("hardware", {})
    if hardware.get("status") == "complete":
        block = integer(hardware.get("blockSize"))
        metrics["QuantumBlockSize"] = block
        metrics["QuantumCircuits"] = block * (block + 1) // 2 if block else None
        metrics["QuantumDepth"] = number(hardware.get("transpiledDepth", {}).get("median"))
        metrics["QuantumSeconds"] = number(hardware.get("executionSeconds"))
        metrics["QuantumMae"] = probability(hardware.get("meanAbsoluteError"))
        metrics["QuantumShots"] = integer(hardware.get("shots"))
    for key, field in (("QuantumTrain", "train"), ("QuantumTest", "test")):
        metrics[key] = integer(quantum.get("dataset", {}).get(field))
    for key, field in (("QuantumQubits", "qubits"), ("QuantumReps", "reps")):
        metrics[key] = integer(quantum.get("kernel", {}).get(field))
    for label, method in {**methods, "Cascade": "cascade"}.items():
        real = sets.get("real-gold", {}).get(method, {})
        metrics[label + "RealFscore"] = probability(real.get("macroF1"))
        metrics[label + "RealN"] = integer(real.get("n"))
    savings = verifier.get("cascade", {}).get("test", {})
    metrics["CascadeSavedPercent"] = (
        round(100 * probability(savings["shareSaved"]), 9)
        if probability(savings.get("shareSaved")) is not None
        else None
    )
    # Calibration exports contain only numeric aggregate bins, never row predictions.
    for label, method in methods.items():
        result = heldout_verifier.get(method, {})
        calibration = result.get("calibration", {})
        bins = calibration.get("bins", calibration.get("reliability", []))
        confusion = result.get("confusion", {})
        n = integer(result.get("n"))
        if n and confusion:
            correct = sum(row.get(label, 0) for label, row in confusion.items())
            metrics[label + "VerifierAccuracy"] = probability(correct / n)
            if label == "Local":
                metrics["VerifierAccuracy"] = metrics[label + "VerifierAccuracy"]
        metrics[label + "Ece"] = probability(calibration.get("ece"))
        if not isinstance(bins, list):
            continue
        for index, record in enumerate(bins):
            if not isinstance(record, dict) or integer(record.get("n", record.get("count"))) in (
                None,
                0,
            ):
                continue
            metrics[f"{label}Bin{index}Confidence"] = probability(
                record.get("meanConfidence", record.get("confidence"))
            )
            metrics[f"{label}Bin{index}Accuracy"] = probability(record.get("accuracy"))
    return metrics, evidence


def published_metrics(root, metrics, evidence):
    """Require recorded reviewer approval of values and the complete source identity."""
    path = root / "paper/measurement-review.json"
    try:
        review = json.loads(path.read_text()) if path.is_file() else {}
    except (ValueError, UnicodeError):
        review = {}
    if not isinstance(review, dict):
        review = {}
    expected = {source["path"]: source["sha256"] for source in evidence.sources}
    approved = review.get("metrics", {})
    identity_ok = (
        isinstance(review.get("reviewedBy"), str)
        and bool(review["reviewedBy"].strip())
        and review.get("sourceHashes") == expected
        and isinstance(approved, dict)
    )
    targets = {
        "RegressionTarget",
        "SituationCount",
        "HeldoutTarget",
        "SynthTarget",
        "ChallengeMinimum",
        "FirstCardTarget",
        "ColdTarget",
        "CachedTarget",
        "ChallengeLimit",
        "RetrievalSmallK",
        "RetrievalLargeK",
        "SequenceLimit",
        "TrainingMinuteCap",
    }
    public = {}
    for key, value in metrics.items():
        is_target = key in targets
        checked = identity_ok and number(approved.get(key)) is not None and approved[key] == value
        public[key] = value if is_target or checked else None
    evidence.warnings.append(
        "Manuscript measurements require reviewer approval tied to all current source hashes."
    )
    return public


def plot_macros(metrics):
    """Emit only finite numeric coordinates or an explicit pending panel."""
    pending = r"\node[fill=white,inner sep=3pt] at (axis description cs:.5,.5) {\textit{pending}};"
    plots = {}
    retrieval = []
    for suffix, style, title in (
        ("RecallFive", "fill=white", r"$k=\RetrievalSmallK$"),
        ("RecallTen", "fill=black!45", r"$k=\RetrievalLargeK$"),
    ):
        points = [
            (title, metrics.get(label + suffix))
            for label, title in (("Lexical", "BM25"), ("Vector", "Vector"), ("Hybrid", "Hybrid"))
        ]
        if all(probability(value) is not None for _, value in points):
            coords = " ".join(
                f"({index},{value:.6f})" for index, (_, value) in enumerate(points, 1)
            )
            retrieval.extend(
                (
                    rf"\addplot[black,{style},area legend] coordinates {{{coords}}};",
                    rf"\addlegendentry{{{title}}}",
                )
            )
    plots["RetrievalPlot"] = "\n".join(retrieval) or pending
    methods = (("Rules", "Rules"), ("Proxy", "GPT"), ("Local", "Local"), ("Cascade", "Cascade"))
    scores = [
        (index, metrics.get(label + "VerifierFscore"))
        for index, (label, _) in enumerate(methods, 1)
    ]
    coords = " ".join(
        f"({title},{score:.6f})" for title, score in scores if probability(score) is not None
    )
    plots["VerifierPlot"] = (
        rf"\addplot[black,fill=black!25] coordinates {{{coords}}};" if coords else pending
    )
    latency = []
    measured_latencies = []
    reliability = []
    for label, title in methods:
        score, ms = (metrics.get(label + "Verifier" + suffix) for suffix in ("Fscore", "Latency"))
        if probability(score) is not None and number(ms) is not None:
            measured_latencies.append(ms)
            latency.append(
                rf"\addplot[only marks,black,mark=*,nodes near coords,point meta=explicit symbolic] "
                rf"coordinates {{({ms:.6f},{score:.6f}) [{title}]}};"
            )
        points = []
        for key, confidence in metrics.items():
            if re.fullmatch(label + r"Bin\d+Confidence", key):
                accuracy = metrics.get(key.replace("Confidence", "Accuracy"))
                if probability(confidence) is not None and probability(accuracy) is not None:
                    points.append((confidence, accuracy))
        if points:
            coords = " ".join(f"({x:.6f},{y:.6f})" for x, y in sorted(points))
            mark = {"Rules": "square*", "Proxy": "triangle*", "Local": "o", "Cascade": "diamond*"}[
                label
            ]
            reliability.extend(
                (
                    rf"\addplot[black,mark={mark}] coordinates {{{coords}}};",
                    rf"\addlegendentry{{{title}}}",
                )
            )
    plots["LatencyPlot"] = "\n".join(latency) or pending
    plots["ReliabilityPlot"] = "\n".join(reliability) or pending
    bounds = max(measured_latencies, default=1) * 1.2 or 1
    axis = rf"\pgfplotsset{{latencybounds/.style={{xmin=0,xmax={bounds:.6f}}}}}" + "\n"
    return axis + "".join(
        "\\newcommand{" + chr(92) + key + "}{%\n" + code + "\n}\n" for key, code in plots.items()
    )


def write_outputs(root=ROOT, include_heldout=False):
    metrics, evidence = collect(root, include_heldout)
    public = published_metrics(root, metrics, evidence)
    output = root / "paper/generated"
    output.mkdir(parents=True, exist_ok=True)

    def macro_name(name):
        return "".join(
            {
                "0": "Zero",
                "1": "One",
                "2": "Two",
                "3": "Three",
                "4": "Four",
                "5": "Five",
                "6": "Six",
                "7": "Seven",
                "8": "Eight",
                "9": "Nine",
            }.get(c, c)
            for c in name
        )

    tex = "% Generated by scripts/numbers.py; do not edit.\n"
    tex += "".join(
        "\\newcommand{" + chr(92) + macro_name(k) + "}{" + formatted(v) + "}\n"
        for k, v in public.items()
        if v is not None
    )
    plots = plot_macros(public)
    tex += "\n".join(line for line in plots.splitlines() if "textit{pending}" not in line) + "\n"
    (output / "numbers.tex").write_text(tex)
    (output / "numbers.json").write_text(json.dumps(metrics, indent=2) + "\n")
    provenance = {
        "sources": evidence.sources,
        "warnings": evidence.warnings,
        "heldout_included": include_heldout,
        "status": "numeric aggregates; approval recorded in measurement-review.json",
        "publishedMetrics": [k for k, v in public.items() if v is not None],
    }
    (output / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")

    def table(filename, heading, rows):
        lines = [
            r"\begin{tabular}{@{}p{.62\linewidth}r@{}}",
            r"\toprule",
            heading + " " + chr(92) * 2,
            r"\midrule",
        ]
        lines += [label + " & " + value + r" \\" for label, value in rows]
        lines += [r"\bottomrule", r"\end{tabular}"]
        (output / filename).write_text("\n".join(lines) + "\n")

    table(
        "evaluation.tex",
        "Measure & Observed",
        [
            (
                "Primary cold answers (text and chip, each)",
                r"\ReviewedAnswerPassed/\ReviewedAnswerTotal",
            ),
            ("Cited facts located / checked", r"\ReviewedTraceLocated/\ReviewedTraceTotal"),
            ("Unsupported / distinct card lines reviewed", r"\ReviewedUnsupported/\ReviewedLines"),
            (
                "True contradictions / false findings",
                r"\ReviewedContradictions/\ReviewedFalseAlarms",
            ),
            ("Slowest primary cold API completion (s)", r"\ReviewedColdSeconds"),
            ("Slowest confirmed cached API completion (s)", r"\ReviewedCachedSeconds"),
        ],
    )
    table(
        "research.tex",
        "Research artifact & Observed",
        [
            ("Generated synthetic patients", r"\SynthPatients"),
            ("Generated synthetic documents", r"\SynthDocuments"),
            ("Code-checked facts / contradictions", r"\SynthFacts / \SynthContradictions"),
            ("Distractors / documentation gaps", r"\SynthDistractors / \SynthGaps"),
            ("Patients with rewritten prose", r"\SynthRewrittenPatients"),
            ("Sample patients / documents", r"\SynthSamplePatients / \SynthSampleDocuments"),
            ("Synthetic challenges generated", r"\SyntheticGenerated"),
            ("Synthetic challenges evaluated", r"\SyntheticChallenges"),
            (
                "Verifier training / validation / test examples",
                r"\TrainExamples / \ValidationExamples / \TestExamples",
            ),
            ("Verifier macro F-score", r"\VerifierMacroFone"),
            ("Verifier accuracy", r"\VerifierAccuracy"),
            ("Verifier median latency (ms)", r"\VerifierLatencyMs"),
            ("Retrieval recall at configured cutoff", r"\RetrievalRecall"),
        ],
    )
    (output / "heldout.tex").write_text(
        "% Challenge blind scores are outside the submission report.\n"
    )
    comparison = [
        r"\begin{tabular}{@{}lrrrr@{}}",
        r"\toprule",
        "Verifier & Examples & Macro F-score & Coverage & Median ms " + chr(92) * 2,
        r"\midrule",
    ]
    for label, title in (
        ("Rules", "Rules only"),
        ("Proxy", "Proxy semantic"),
        ("Local", "Local adapter"),
        ("Cascade", "Local + GPT cascade"),
    ):
        comparison.append(
            title
            + " & "
            + " & ".join(
                chr(92) + label + "Verifier" + suffix
                for suffix in ("N", "Fscore", "Coverage", "Latency")
            )
            + " "
            + chr(92) * 2
        )
    comparison.extend((r"\bottomrule", r"\end{tabular}"))
    (output / "verifier.tex").write_text("\n".join(comparison) + "\n")
    retrieval_table = [
        r"\begin{tabular}{@{}lrrrr@{}}",
        r"\toprule",
        r"Retrieval & Queries & Recall@$\RetrievalSmallK$ & Recall@$\RetrievalLargeK$ & MRR@$\RetrievalLargeK$ "
        + chr(92) * 2,
        r"\midrule",
    ]
    for label, title in (("Lexical", "BM25"), ("Vector", "Vector"), ("Hybrid", "Hybrid")):
        if any(
            public.get(label + key) is None
            for key in ("RetrievalN", "RecallFive", "RecallTen", "MrrTen")
        ):
            continue
        retrieval_table.append(
            title
            + " & "
            + " & ".join(
                chr(92) + label + suffix
                for suffix in ("RetrievalN", "RecallFive", "RecallTen", "MrrTen")
            )
            + " "
            + chr(92) * 2
        )
    retrieval_table.extend((r"\bottomrule", r"\end{tabular}"))
    (output / "retrieval.tex").write_text("\n".join(retrieval_table) + "\n")
    return metrics, evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--include-heldout",
        action="store_true",
        help="Only after the H+7 review authorizes opening held-out results",
    )
    args = parser.parse_args()
    metrics, evidence = write_outputs(include_heldout=args.include_heldout)
    print(
        f"Generated aggregates and measured plots; {sum(v is None for v in metrics.values())} unavailable fields omitted."
    )
    for warning in evidence.warnings:
        print(warning)


if __name__ == "__main__":
    main()
