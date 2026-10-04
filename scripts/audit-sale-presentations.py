"""Check that every public presentation plan has a matching valid PDF and WebP."""

from pathlib import Path

from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1] / "public"
GROUPS = {
    "La Gloire apartments": (ROOT / "plans/la-gloire", 102, "[ABCD][0-9][0-9].webp"),
    "La Gloire building": (ROOT / "plans/la-gloire/ensemble", 11, "*.webp"),
    "Diar apartments and RDC": (ROOT / "plans/diar-al-yassamine", 30, "*.webp"),
    "Diar A5/A6 floors": (ROOT / "models/yassamine", 10, "*.pdf"),
}

total = 0
for label, (directory, expected, pattern) in GROUPS.items():
    sources = sorted(directory.glob(pattern))
    if len(sources) != expected:
        raise AssertionError(f"{label}: expected {expected} masters, found {len(sources)}")
    presented = directory / "presentation"
    webps = sorted(presented.glob("*.webp"))
    pdfs = sorted(presented.glob("*.pdf"))
    if len(webps) != expected or len(pdfs) != expected:
        raise AssertionError(f"{label}: incomplete copies ({len(webps)} WebP, {len(pdfs)} PDF)")
    for source in sources:
        webp = presented / f"{source.stem}.webp"
        pdf = presented / f"{source.stem}.pdf"
        with Image.open(webp) as preview:
            preview.verify()
        if source.suffix == ".webp":
            with Image.open(source) as original, Image.open(webp) as preview:
                if original.size != preview.size:
                    raise AssertionError(f"Changed drawing dimensions: {webp}")
        reader = PdfReader(pdf)
        if len(reader.pages) != 1:
            raise AssertionError(f"Expected a single-page PDF: {pdf}")
        if float(reader.pages[0].mediabox.width) < 500 or float(reader.pages[0].mediabox.height) < 500:
            raise AssertionError(f"Invalid PDF page size: {pdf}")
        total += 1
    print(f"{label}: {expected} matching WebP/PDF pairs")

print(f"Validated {total} presentation plans; source files preserved.")
