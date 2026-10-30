import json
import tempfile
import unittest
from pathlib import Path

from numbers import collect, formatted, write_outputs


class NumbersTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def report(self, **extra):
        return {"mode": "live", "rows": [{"id": "a", "pass": True, "suitePass": False,
                                          "capture": {"mock": False}}], **extra}

    def test_missing_is_pending_and_never_zero(self):
        metrics, evidence = write_outputs(self.root)
        self.assertIsNone(metrics["RegressionPassed"])
        self.assertEqual(formatted(None), r"\textit{pending}")
        self.assertEqual(formatted(0), "0")
        self.assertIn(r"\newcommand{\RegressionPassed}{\textit{pending}}",
                      (self.root / "paper/generated/numbers.tex").read_text())

    def test_answer_and_suite_passes_are_distinct(self):
        self.put("eval/output/results.json", self.report())
        metrics, _ = collect(self.root)
        self.assertEqual(metrics["RegressionPassed"], 1)
        self.assertEqual(metrics["SuitePassed"], 0)

    def test_mock_and_duplicate_questions_are_not_results(self):
        for report in (self.report(mode="mock"), self.report(rows=[
            {"id": "a", "pass": True, "capture": {"mock": True}}]), self.report(rows=[
            {"id": "a", "pass": True}, {"id": "a", "pass": False}])):
            self.put("eval/output/results.json", report)
            self.assertIsNone(collect(self.root)[0]["RegressionPassed"])

    def test_warm_attempt_is_not_a_cache_measurement(self):
        self.put("eval/output/results.json", self.report(timings=[
            {"coldMs": 2000, "warmMs": 3500, "cached": False}]))
        metrics, _ = collect(self.root)
        self.assertEqual(metrics["ColdMaxSeconds"], 2)
        self.assertEqual(metrics["WarmMaxSeconds"], 3.5)
        self.assertEqual(metrics["CacheHits"], 0)
        self.assertIsNone(metrics["CachedMaxSeconds"])

    def test_complete_bundle_is_not_combined_with_new_regression(self):
        self.put("eval/output/results.json", self.report(timings=[{"coldMs": 1000}]))
        self.put("eval/output/regression.json", self.report(rows=[{"id": "b", "pass": False}]))
        metrics, evidence = collect(self.root)
        self.assertEqual(metrics["ColdMaxSeconds"], 1)
        self.assertEqual(metrics["RegressionPassed"], 1)
        self.assertTrue(any("without merging" in w for w in evidence.warnings))

    def test_generated_challenges_are_not_counted_as_executed(self):
        self.put("eval/output/synthetic.json", {"mode": "live", "generated": 150,
                                               "totals": {"challenges": 150, "measured": 0}})
        metrics, _ = collect(self.root)
        self.assertEqual(metrics["SyntheticGenerated"], 150)
        self.assertEqual(metrics["SyntheticChallenges"], 0)

    def test_nested_verifier_metrics_and_empty_baselines(self):
        self.put("ml/verifier/results.json", {"sets": {"synthetic_heldout_families": {
            "local_qlora": {"n": 18, "macroF1": 0.5, "coverage": 1,
                            "latencyMs": {"p50": 85}},
            "proxy_fast": {"n": 0, "macroF1": 0}}}})
        metrics, _ = collect(self.root)
        self.assertEqual(metrics["VerifierMacroFone"], 0.5)
        self.assertEqual(metrics["VerifierLatencyMs"], 85)
        self.assertIsNone(metrics["ProxyVerifierFscore"])

    def test_heldout_file_is_not_opened_by_default(self):
        path = self.root / "eval/output/heldout.json"
        path.parent.mkdir(parents=True)
        path.write_text("invalid and private")
        metrics, evidence = collect(self.root)
        self.assertIsNone(metrics["Tier1Count"])
        self.assertFalse(any("Invalid input" in w for w in evidence.warnings))
        self.assertFalse(any("heldout.json" in s["path"] for s in evidence.sources))

    def test_heldout_opt_in_aggregates_without_exporting_prose(self):
        self.put("eval/output/heldout.json", self.report(rows=[{
            "id": "secret", "pass": True, "tier": 2, "reason": "PRIVATE TEXT",
            "namedScores": {"relevance": 1, "grounding": 0}}]))
        metrics, _ = write_outputs(self.root, include_heldout=True)
        self.assertEqual(metrics["Tier2Relevance"], 1)
        self.assertEqual(metrics["Tier2Grounding"], 0)
        for path in (self.root / "paper/generated").iterdir():
            self.assertNotIn("PRIVATE TEXT", path.read_text())

    def test_zero_audited_claims_does_not_imply_measured_precision(self):
        self.put("eval/output/results.json", self.report(audits={"a": {
            "status": "measured", "composed": {"checked": 0, "failures": []}}}))
        metrics, _ = collect(self.root)
        self.assertEqual(metrics["ComposedChecked"], 0)
        self.assertEqual(metrics["ComposedFailures"], 0)
        self.assertNotIn("ComposedPrecision", metrics)

    def test_invalid_numeric_and_malformed_json_are_pending(self):
        self.put("ml/verifier/results.json", {"macroF1": float("nan"), "accuracy": True,
                                              "latencyMs": r"\input{secret}"})
        path = self.root / "eval/output/results.json"
        path.parent.mkdir(parents=True)
        path.write_text("{")
        metrics, evidence = collect(self.root)
        self.assertIsNone(metrics["VerifierAccuracy"])
        self.assertIsNone(metrics["VerifierMacroFone"])
        self.assertIsNone(metrics["VerifierLatencyMs"])
        self.assertTrue(any("Invalid input" in w for w in evidence.warnings))


if __name__ == "__main__":
    unittest.main()
