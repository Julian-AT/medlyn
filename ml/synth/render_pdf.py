import argparse
import hashlib
import io
import json
import random
import textwrap
from pathlib import Path

from .materialise import find_patient
from .normalise import normalise


def render_pdf(record: dict, out: Path, scan: bool = False) -> list[Path]:
    """Render each document, optionally retaining scanned pages as PNGs and image-only PDFs."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen.canvas import Canvas

    out.mkdir(parents=True, exist_ok=True)
    paths = []
    for document in record["documents"]:
        doc_id = document["metadata"]["id"]
        path = out / f"{doc_id}.pdf"
        canvas = Canvas(str(path), pagesize=A4, invariant=True, pageCompression=1)
        canvas.setTitle(document["metadata"]["title"])
        canvas.setAuthor("Medlyn synthetic research corpus")
        _width, height = A4
        y = height - 42
        canvas.setFont("Courier", 8)
        for line in normalise(document["text"]).splitlines():
            for wrapped in textwrap.wrap(line, width=100, replace_whitespace=False) or [""]:
                if y < 42:
                    canvas.showPage()
                    canvas.setFont("Courier", 8)
                    y = height - 42
                canvas.drawString(30, y, wrapped)
                y -= 12
        canvas.save()
        paths.append(path)
        if scan:
            import pymupdf
            from PIL import Image

            rng = random.Random(int.from_bytes(hashlib.sha256(doc_id.encode()).digest()[:8], "big"))
            scan_path = out / f"{doc_id}-scan.pdf"
            with pymupdf.open(path) as source, pymupdf.open() as scanned:
                for page_number, page in enumerate(source):
                    pix = page.get_pixmap(dpi=144, alpha=False)
                    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                    image = image.rotate(
                        rng.uniform(-0.6, 0.6), Image.Resampling.BICUBIC, fillcolor="white"
                    )
                    pixels = image.load()
                    for _ in range(image.width * image.height // 1500):
                        x, y_pixel = rng.randrange(image.width), rng.randrange(image.height)
                        shade = rng.randrange(175, 235)
                        pixels[x, y_pixel] = (shade, shade, shade)
                    image_path = out / f"{doc_id}-scan-{page_number + 1:02d}.png"
                    image.save(image_path)
                    buffer = io.BytesIO()
                    image.save(buffer, format="PNG")
                    target = scanned.new_page(width=page.rect.width, height=page.rect.height)
                    target.insert_image(target.rect, stream=buffer.getvalue())
                scanned.save(scan_path, deflate=True)
            paths.append(scan_path)
    return paths


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient", required=True)
    parser.add_argument("--data", type=Path, default=Path("data/synth-v1"))
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--scan", action="store_true")
    args = parser.parse_args()
    paths = render_pdf(find_patient(args.data, args.patient), args.out, args.scan)
    print(json.dumps({"pdfs": [str(path) for path in paths], "scan": args.scan}))


if __name__ == "__main__":
    main()
