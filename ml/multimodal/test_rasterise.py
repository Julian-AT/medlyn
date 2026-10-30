from pathlib import Path

import pymupdf
import pytest

from multimodal.rasterise import rasterise


def test_embedded_words_and_coordinates(tmp_path: Path):
    source = tmp_path / "source.pdf"
    with pymupdf.open() as document:
        page = document.new_page()
        page.insert_text((40, 60), "Test 7301")
        page.insert_text((40, 80), "Messwert 7 mm")
        document.save(source)
    result = rasterise(source, tmp_path / "pages")
    page = result["pages"][0]
    assert page["source"] == "embedded"
    assert page["dpi"] == 200
    assert [line["text"] for line in page["lines"]] == ["Test 7301", "Messwert 7 mm"]
    assert len(page["lines"][0]["words"]) == 2
    assert Path(page["imagePath"]).exists()
    for line in page["lines"]:
        box = line["bbox"]
        assert 0 <= box["x0"] < box["x1"] <= 1
        assert 0 <= box["y0"] < box["y1"] <= 1


def test_rotated_text_boxes_follow_pixmap(tmp_path: Path):
    source = tmp_path / "rotated.pdf"
    with pymupdf.open() as document:
        page = document.new_page(width=200, height=400)
        page.insert_text((20, 40), "Rotation")
        page.set_rotation(90)
        document.save(source)
    page = rasterise(source, tmp_path / "pages")["pages"][0]
    assert page["width"] > page["height"]
    assert page["lines"][0]["bbox"]["x0"] > 0.8


def test_scan_has_no_embedded_text(tmp_path: Path):
    source = tmp_path / "scan.pdf"
    with pymupdf.open() as original, pymupdf.open() as scanned:
        page = original.new_page()
        page.insert_text((40, 60), "Image only")
        image = page.get_pixmap()
        target = scanned.new_page()
        target.insert_image(target.rect, stream=image.tobytes("png"))
        scanned.save(source)
    page = rasterise(source, tmp_path / "pages")["pages"][0]
    assert page["source"] == "scan"
    assert page["lines"] == []


def test_rejects_invalid_resolution(tmp_path: Path):
    with pytest.raises(ValueError, match="dpi"):
        rasterise(tmp_path / "absent.pdf", tmp_path / "pages", dpi=0)
