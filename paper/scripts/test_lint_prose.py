import unittest

from lint_prose import violations


class ProseTest(unittest.TestCase):
    def test_reject_dash_spellings(self):
        for dash in ("—", "---", "--", r"\textemdash", r"\emdash"):
            with self.subTest(dash=dash):
                self.assertTrue(violations(f"Evidence {dash} claim"))

    def test_reject_words_and_inflections(self):
        for word in (
            "Delve",
            "seamlessly",
            "robust",
            "leveraging",
            "cutting-edge",
            "comprehensive",
            "crucial",
            "pivotal",
            "showcases",
            "innovative",
            "harness",
        ):
            with self.subTest(word=word):
                self.assertTrue(violations(word))

    def test_plain_prose_and_word_boundaries(self):
        self.assertEqual(
            violations("We select located facts. The harnessing claim fails."),
            [(1, "prohibited word: harnessing")],
        )
        self.assertEqual(violations("We select located facts. Clinical scores are pending."), [])

    def test_technical_robust_requires_justification(self):
        self.assertEqual(
            violations(
                "We use robust estimation. % prose-lint: allow-robust "
                "Names a statistical estimator resistant to outliers."
            ),
            [],
        )
        self.assertTrue(violations("A robust system. % prose-lint: allow-robust yes"))
        self.assertTrue(
            violations(
                "A robust and seamless system. % prose-lint: allow-robust "
                "Names a statistical estimator resistant to outliers."
            )
        )

    def test_comments_are_not_prose(self):
        self.assertEqual(violations("We report results. % --- internal comment"), [])
        self.assertEqual(violations("First line\nA seamless system.")[0][0], 2)


if __name__ == "__main__":
    unittest.main()
