"""Render a runtime challenge-shaped corpus locally for round-trip checks."""

import argparse
import json
import os
from pathlib import Path

import pymupdf
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from synth.normalise import normalise

REPO_ROOT = Path(__file__).resolve().parents[2]


def render_text(text: str, output: Path, scan: bool = False):
    output.parent.mkdir(parents=True, exist_ok=True)
    fonts = [
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    font = next((path for path in fonts if path.exists()), None)
    if font is None:
        raise RuntimeError("A Unicode Arial or DejaVuSans font is required")
    pdfmetrics.registerFont(TTFont("ClinicalSource", str(font)))
    page = canvas.Canvas(str(output), pagesize=A4)
    page.setFont("ClinicalSource", 10)
    y = A4[1] - 42
    for line in normalise(text).splitlines():
        for physical in simpleSplit(line, "ClinicalSource", 10, A4[0] - 84) or [""]:
            if y < 42:
                page.showPage()
                page.setFont("ClinicalSource", 10)
                y = A4[1] - 42
            page.drawString(42, y, physical)
            y -= 14
    page.save()
    if scan:
        with pymupdf.open(output) as source, pymupdf.open() as scanned:
            for original in source:
                pixmap = original.get_pixmap(dpi=200, alpha=False)
                target = scanned.new_page(width=original.rect.width, height=original.rect.height)
                target.insert_image(target.rect, stream=pixmap.tobytes("png"))
            scanned.save(output.with_suffix(".scan.pdf"))
        output.with_suffix(".scan.pdf").replace(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default=os.getenv("MEDLYN_DATA_PATH"))
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--scan", action="store_true")
    args = parser.parse_args()
    if not args.data:
        parser.error("--data or MEDLYN_DATA_PATH is required")
    root = (REPO_ROOT / args.data).resolve()
    destination = args.out.resolve()
    if REPO_ROOT in destination.parents or destination == REPO_ROOT:
        raise ValueError("Round-trip PDFs must be written outside the repository")
    outputs = []
    for source in sorted((root / "documents").glob("*.json")):
        document = json.loads(source.read_text(encoding="utf-8"))
        output = destination / f"{source.stem}.pdf"
        render_text(document["text"], output, args.scan)
        outputs.append(str(output))
    print(json.dumps({"pdfs": outputs, "scan": args.scan}))


if __name__ == "__main__":
    main()
