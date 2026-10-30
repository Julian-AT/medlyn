import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ManuscriptTest(unittest.TestCase):
    def test_section_order_matches_lane_contract(self):
        sections = re.findall(r"\\section\{([^}]+)\}", (ROOT / "main.tex").read_text())
        self.assertEqual(
            sections,
            [
                "Introduction",
                "Background",
                "System Architecture",
                "Synthetic Data",
                "Verifier Training",
                "Results",
                "Conclusion",
            ],
        )

    def test_all_references_are_cited_and_verified(self):
        source = (ROOT / "main.tex").read_text()
        keys = set(re.findall(r"@\w+\{([^,]+),", (ROOT / "refs.bib").read_text()))
        cited = {
            key.strip()
            for group in re.findall(r"\\cite[pt]?\{([^}]+)\}", source)
            for key in group.split(",")
        }
        verified = json.loads((ROOT / "reference-verification.json").read_text())["references"]
        self.assertGreaterEqual(len(keys), 30)
        self.assertEqual(cited, keys)
        self.assertEqual(set(verified), keys)
        for key, record in verified.items():
            with self.subTest(key=key):
                self.assertTrue(record["searchQuery"].strip())
                self.assertTrue(record["primaryUrl"].startswith("https://"))

    def test_four_vector_figures_and_generated_measurement_inputs(self):
        source = (ROOT / "main.tex").read_text()
        figure_paths = re.findall(r"\\input\{(figures/[^}]+)\}", source)
        self.assertEqual(len(figure_paths), 4)
        for name in figure_paths:
            figure = (ROOT / name).read_text()
            self.assertEqual(figure.count(r"\begin{figure}"), 1)
            self.assertIn(r"\begin{tikzpicture}", figure)
            self.assertNotIn(r"\includegraphics", figure)
        self.assertIn(r"\input{generated/numbers.tex}", source)
        self.assertNotIn(r"\begin{tabular}", source)

    def test_submission_has_no_placeholders_or_direct_empirical_coordinates(self):
        paths = [ROOT / "main.tex", ROOT / "appendix-quantum.tex", ROOT / "generated/numbers.tex"]
        for path in paths:
            self.assertNotRegex(path.read_text(), r"(?i)pending|TBD|TODO|not yet|—|---")
        appendix = (ROOT / "appendix-quantum.tex").read_text()
        self.assertIn(r"\QuantumCircuits", appendix)
        self.assertIn(r"\input{appendix-quantum}", (ROOT / "main.tex").read_text())


if __name__ == "__main__":
    unittest.main()
