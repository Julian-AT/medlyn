import os

import pytest

from publish.common import ROOT, load_environment, read_json
from publish.scan import ChallengeScanner, normalise


def scanner():
    text = "".join(chr(0x400 + index) for index in range(500))
    return ChallengeScanner({"reference": text}, expected_documents=1), text


@pytest.mark.parametrize("start", [0, 1, 29, 59, 60, 61, 179])
def test_scanner_finds_every_aligned_and_unaligned_window(start):
    scan, text = scanner()
    assert scan.find({"text": text[start : start + 120]}) is not None


def test_short_overlap_and_normalisation():
    scan, text = scanner()
    assert scan.find(text[1:120]) is None
    assert normalise("a<BR>b &gt; &lt; &amp; &quot;") == 'a b > < & "'
    assert scan.find({"nested": [{"claim": text[19:200]}]}) is not None


def test_failed_scan_never_logs_source_text():
    scan, text = scanner()
    with pytest.raises(ValueError, match="release aborted") as error:
        scan.check(text[31:151], "synthetic-record")
    assert text[31:151] not in str(error.value)
    report = scan.report()
    assert report["matchCount"] == 1
    assert report["status"] == "failed"
    assert "normalisedOffset" in report["matches"][0]


def test_scanner_requires_all_eight_documents():
    with pytest.raises(ValueError, match="Expected 8"):
        ChallengeScanner({"one": "x" * 200})


def test_runtime_challenge_passage_is_detected_without_a_stored_fixture():
    load_environment()
    value = os.environ.get("MEDLYN_DATA_PATH")
    if not value or not ((ROOT / value) / "documents").exists():
        pytest.skip("Local challenge corpus is unavailable")
    scan = ChallengeScanner.from_environment()
    path = next(((ROOT / value) / "documents").glob("*.json"))
    passage = normalise(read_json(path)["text"])[17:137]
    assert scan.find({"synthetic": {"documents": [{"text": passage}]}}) is not None


def test_missing_reference_path_fails_closed(monkeypatch):
    monkeypatch.setenv("MEDLYN_DATA_PATH", "/private/tmp/medlyn-missing-reference-documents")
    with pytest.raises(ValueError, match="Expected 8"):
        ChallengeScanner.from_environment()


def test_unicode_space_and_utf16_units_follow_the_guard():
    scan = ChallengeScanner({"reference": "😀" * 80}, expected_documents=1)
    assert scan.find("😀" * 60) is not None
    assert scan.find("😀" * 59) is None
    assert scan.report()["referenceSha256"]
    assert normalise("a\u00a0b\ufeffc") == "a b c"
