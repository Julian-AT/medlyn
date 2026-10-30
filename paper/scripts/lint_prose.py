"""Reject dash punctuation and promotional language in the manuscript source."""

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORDS = re.compile(
    r"\b(?:delv\w*|seamless\w*|robust(?:ly|ness)?|leverag\w*|cutting[- ]edge|"
    r"comprehensive\w*|crucial\w*|pivotal\w*|showcas\w*|innovativ\w*|harness\w*)\b",
    re.IGNORECASE,
)
DASHES = re.compile(r"—|---|--|\\(?:textemdash|emdash)\b")
TECHNICAL = re.compile(r"%\s*prose-lint: allow-robust\s+(.{20,})$")


def violations(text):
    """Return line-numbered violations; a justified technical robust use may be exempted."""
    found = []
    for line_number, line in enumerate(text.splitlines(), 1):
        prose = re.split(r"(?<!\\)%", line, maxsplit=1)[0]
        for match in DASHES.finditer(prose):
            found.append((line_number, f"dash punctuation: {match.group()}"))
        for match in WORDS.finditer(prose):
            if match.group().lower() == "robust" and TECHNICAL.search(line):
                continue
            found.append((line_number, f"prohibited word: {match.group()}"))
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path)
    args = parser.parse_args()
    paths = args.paths or [
        ROOT / "main.tex",
        ROOT / "appendix-quantum.tex",
        *sorted((ROOT / "figures").glob("*.tex")),
    ]
    errors = []
    for path in paths:
        errors.extend(f"{path}:{line}: {message}" for line, message in violations(path.read_text()))
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    print(f"Prose lint passed: {len(paths)} files, 0 violations.")


if __name__ == "__main__":
    main()
