"""Rasterise a PDF and retain embedded text coordinates in reading order."""

import argparse
import json
from pathlib import Path

import pymupdf


def rasterise(source: Path, out: Path, dpi: int = 200) -> dict:
    if dpi < 72 or dpi > 600:
        raise ValueError("dpi must be between 72 and 600")
    out.mkdir(parents=True, exist_ok=True)
    pages = []
    with pymupdf.open(source) as document:
        if document.needs_pass:
            raise ValueError("Encrypted PDF requires an unlocked copy")
        for index, page in enumerate(document):
            image = page.get_pixmap(dpi=dpi, alpha=False, colorspace=pymupdf.csRGB)
            image_path = (out / f"page-{index + 1:04d}.png").resolve()
            image.save(image_path)
            groups = {}
            for x0, y0, x1, y1, text, block, line, _word in page.get_text("words", sort=True):
                # Text coordinates are unrotated; pixmaps respect page rotation.
                rect = pymupdf.Rect(x0, y0, x1, y1) * page.rotation_matrix
                bbox = {
                    "x0": max(0, min(1, rect.x0 / page.rect.width)),
                    "y0": max(0, min(1, rect.y0 / page.rect.height)),
                    "x1": max(0, min(1, rect.x1 / page.rect.width)),
                    "y1": max(0, min(1, rect.y1 / page.rect.height)),
                }
                groups.setdefault((block, line), []).append({"text": text, "bbox": bbox})
            lines = []
            for words in groups.values():
                lines.append({
                    "text": " ".join(word["text"] for word in words),
                    "bbox": {
                        "x0": min(word["bbox"]["x0"] for word in words),
                        "y0": min(word["bbox"]["y0"] for word in words),
                        "x1": max(word["bbox"]["x1"] for word in words),
                        "y1": max(word["bbox"]["y1"] for word in words),
                    },
                    "words": words,
                })
            pages.append({
                "page": index + 1,
                "imagePath": str(image_path),
                "width": image.width,
                "height": image.height,
                "dpi": dpi,
                "source": "embedded" if lines else "scan",
                "lines": lines,
            })
    if not pages:
        raise ValueError("PDF has no pages")
    result = {"version": 1, "pages": pages}
    (out / "pages.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--dpi", default=200, type=int)
    args = parser.parse_args()
    result = rasterise(args.pdf, args.out, args.dpi)
    print(json.dumps({"pages": len(result["pages"]), "manifest": str(args.out / "pages.json")}))


if __name__ == "__main__":
    main()
