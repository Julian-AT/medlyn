import pymupdf

from synth.render import render_patient
from synth.render_pdf import render_pdf


def test_pdf_and_scan_are_readable_documents(tmp_path):
    record = render_patient(1)
    record["documents"] = record["documents"][:1]
    paths = render_pdf(record, tmp_path, scan=True)
    assert len(paths) == 2
    with pymupdf.open(paths[0]) as pdf:
        assert len(pdf) >= 1
        assert record["patient"]["name"] in pdf[0].get_text()
        assert "Applikation mo mi ab na Einheit Info" in "".join(page.get_text() for page in pdf)
        pages = len(pdf)
    with pymupdf.open(paths[1]) as scan:
        assert len(scan) == pages
        assert all(page.get_images() for page in scan)
        assert all(not page.get_text().strip() for page in scan)
    assert len(list(tmp_path.glob("*-scan-*.png"))) == pages
