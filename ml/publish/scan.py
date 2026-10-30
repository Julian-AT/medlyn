"""Fail closed on any normalised 120-character challenge-document overlap."""

import hashlib
import os
import re
from array import array
from collections import defaultdict

from .common import ROOT, load_environment, read_json

WINDOW = 120
SEED = WINDOW // 2


def normalise(text):
    text = re.sub(r"<BR>", "\n", text, flags=re.IGNORECASE)
    for old, new in (("&gt;", ">"), ("&lt;", "<"), ("&amp;", "&"), ("&quot;", '"')):
        text = text.replace(old, new)
    text = re.sub(r"[\s\ufeff]+", " ", text)
    # JavaScript's guard counts UTF-16 units; retain its threshold for astral characters too.
    if re.search(r"[\U00010000-\U0010ffff]", text):
        text = "".join(chr(unit) for unit in array("H", text.encode("utf-16-le")))
    return text


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield str(key)
            yield from strings(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from strings(item)


def trie_pattern(words):
    trie = {}
    for word in words:
        node = trie
        for char in word:
            node = node.setdefault(char, {})
        node[None] = {}

    def build(node):
        branches = [re.escape(char) + build(child) for char, child in node.items() if char]
        result = "(?:" + "|".join(branches) + ")" if len(branches) > 1 else "".join(branches)
        return "(?:" + result + ")?" if None in node and branches else result

    return re.compile(build(trie))


class ChallengeScanner:
    def __init__(self, documents, expected_documents=8):
        if len(documents) != expected_documents:
            raise ValueError(f"Expected {expected_documents} challenge documents for release scan")
        self.documents = {key: normalise(text) for key, text in documents.items()}
        if any(len(text) < WINDOW for text in self.documents.values()):
            raise ValueError("Challenge scan requires nonempty reference documents")
        self.seeds = defaultdict(list)
        for key, text in self.documents.items():
            for offset in range(0, len(text) - SEED + 1, SEED):
                self.seeds[text[offset : offset + SEED]].append((key, offset))
        self.pattern = trie_pattern(self.seeds)
        self.records = 0
        self.characters = 0
        self.matches = []

    @classmethod
    def from_environment(cls):
        load_environment()
        value = os.environ.get("MEDLYN_DATA_PATH")
        if not value:
            raise ValueError("MEDLYN_DATA_PATH is required; release scan cannot be skipped")
        directory = (ROOT / value).resolve() / "documents"
        documents = {
            path.stem: read_json(path).get("text", "") for path in directory.glob("*.json")
        }
        return cls(documents)

    def find(self, value):
        text = normalise("\n".join(strings(value)))
        self.characters += len(text)
        self.records += 1
        # Every shared 120-char window contains a complete reference-aligned 60-char seed.
        position = 0
        while match := self.pattern.search(text, position):
            at = match.start()
            position = at + 1
            for key, offset in self.seeds[match[0]]:
                source = self.documents[key]
                left = 0
                while left < SEED and at > left and offset > left:
                    if text[at - left - 1] != source[offset - left - 1]:
                        break
                    left += 1
                right = SEED
                while right < WINDOW and at + right < len(text) and offset + right < len(source):
                    if text[at + right] != source[offset + right]:
                        break
                    right += 1
                if left + right >= WINDOW:
                    return {"documentId": key, "normalisedOffset": offset - left}
        return None

    def check(self, value, identity):
        match = self.find(value)
        if match:
            self.matches.append({"record": identity, **match})
            raise ValueError(f"Challenge passage detected in {identity}; release aborted")

    def report(self):
        return {
            "status": "passed" if not self.matches else "failed",
            "windowCharacters": WINDOW,
            "referenceDocuments": len(self.documents),
            "referenceSha256": {
                key: hashlib.sha256(text.encode(errors="surrogatepass")).hexdigest()
                for key, text in self.documents.items()
            },
            "recordsScanned": self.records,
            "charactersScanned": self.characters,
            "matches": self.matches,
            "matchCount": len(self.matches),
            "method": "check-data normalisation; exhaustive 120-character overlaps via aligned seeds",
        }
