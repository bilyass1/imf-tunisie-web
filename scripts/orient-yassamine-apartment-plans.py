"""Rotate only sideways branded A5.a, A5.b and A6 apartment plans.

Original architect files and already-upright A1/A2/A3 and floor sheets remain unchanged.
Run once with --apply after inspecting the source presentation plans.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re

from PIL import Image
from pypdf import PdfReader, PdfWriter

DIRECTORY = Path(__file__).resolve().parents[1] / "public/plans/diar-al-yassamine/presentation"
PLAN = re.compile(r"(?:A5[0-4][1-4]|A5b[0-4][1-5]|A6[ab][0-4][1-4])$")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    paths = sorted(path for path in DIRECTORY.glob("*.webp") if PLAN.fullmatch(path.stem))
    if len(paths) != 77:
        raise RuntimeError(f"Expected 77 A5.a/A5.b/A6 apartment plans; found {len(paths)}")
    changed = 0
    for webp in paths:
        pdf = webp.with_suffix(".pdf")
        if not pdf.is_file():
            raise FileNotFoundError(pdf)
        with Image.open(webp) as original:
            if original.width > original.height:
                page = PdfReader(pdf).pages[0]
                if float(page.mediabox.width) <= float(page.mediabox.height):
                    raise ValueError(f"The preview is upright but its PDF is sideways: {pdf}")
                continue
            if not args.apply:
                changed += 1
                continue
            rotated = original.convert("RGB").rotate(90, expand=True)
        reader = PdfReader(pdf)
        if len(reader.pages) != 1:
            raise ValueError(f"Expected a single-page PDF: {pdf}")
        page = reader.pages[0]
        # Keep the existing PDF image stream; only rotate its page coordinates.
        page.rotate(270)
        page.transfer_rotation_to_content()
        if float(page.mediabox.width) <= float(page.mediabox.height):
            raise ValueError(f"Rotation did not produce a landscape page: {pdf}")
        writer = PdfWriter()
        writer.add_page(page)
        pdf_temp = pdf.with_suffix(".pdf.tmp")
        webp_temp = webp.with_suffix(".webp.tmp")
        try:
            with pdf_temp.open("wb") as output:
                writer.write(output)
            rotated.save(webp_temp, "WEBP", quality=91, method=3)
            pdf_temp.replace(pdf)
            webp_temp.replace(webp)
            changed += 1
        finally:
            pdf_temp.unlink(missing_ok=True)
            webp_temp.unlink(missing_ok=True)
    print(f"{changed} sideways apartment plans {'rotated' if args.apply else 'would be rotated'}")


if __name__ == "__main__":
    main()
