"""Create IMF presentation copies without modifying source sales plans or 3D textures.

Usage:
  python scripts/rebrand-sale-plans.py --sample
  python scripts/rebrand-sale-plans.py --all
  python scripts/rebrand-sale-plans.py --yassamine-rdc
  python scripts/rebrand-sale-plans.py --a6-source "C:/path/to/imf a6 a et b"
  python scripts/rebrand-sale-plans.py --a5b-source "E:/5-PROJET__DIAR AL YASSAMINE/VENTE__PARCELLE A5/A5.b"

The template regions below cover only the previous IMF contact panels. The
original PDF/DWG/WebP files remain available for technical and legal reference.
"""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LOGO = Image.open(PUBLIC / "brands/imf.webp").convert("RGBA")
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
PHONE = "+216 26 711 008"
EMAIL = "contact@imf-immobiliere.tn"
WEB = "imf-immobiliere.tn"
POPPM = Path("C:/Users/yassi/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe")

# x, top, width, height as fractions of the original page or image.
# Each region was inspected against representative plans from that template.
BOXES = {
    "gloire_lot": (.689, .021, .293, .101),
    "gloire_floor": (.022, .017, .383, .069),
    "gloire_cover": (.047, .854, .607, .129),
    "yassamine_a123_lot": (.800, .021, .192, .193),
    # The RDC sheets have a narrower contact cell than the apartment sheets.
    # Its right edge is inside the page frame, not at the image's right edge.
    "yassamine_a123_floor": (.748, .575, .210, .161),
    "yassamine_a5_lot": (.800, .800, .192, .198),
}

# The A3 title block is a few pixels farther left than those of A1 and A2.
YASSAMINE_RDC_BOXES = {
    "RDC-A1": BOXES["yassamine_a123_floor"],
    "RDC-A2": BOXES["yassamine_a123_floor"],
    "RDC-A3": (.744, .575, .207, .161),
}

# The floor PDFs use different crop/rotation offsets. Coordinates were checked
# against each rendered sheet, and cover only the existing contact panel.
MODEL_BOXES = {
    "A5a-0": ((.767, .527, .228, .174), False),
    "A5a-1": ((.767, .453, .228, .174), False),
    "A5b-0": ((.767, .527, .228, .174), False),
    "A5b-1": ((.767, .453, .228, .174), False),
    "A6a-0": ((.709, .510, .244, .185), False),
    "A6a-1": ((.727, .370, .266, .203), False),
    "A6a-4": ((.727, .370, .266, .203), False),
    "A6b-0": ((.304, .709, .185, .241), True),
    "A6b-1": ((.727, .370, .266, .203), False),
    "A6b-2": ((.727, .370, .266, .203), False),
}


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), max(11, size))


def fitted_font(draw: ImageDraw.ImageDraw, value: str, path: Path, maximum: int, width: int) -> ImageFont.FreeTypeFont:
    size = maximum
    while size > 11:
        face = font(path, size)
        bounds = draw.textbbox((0, 0), value, font=face)
        if bounds[2] - bounds[0] <= width:
            return face
        size -= 1
    return font(path, 11)


def card(width: int, height: int, project: str, rotated: bool = False) -> Image.Image:
    if rotated:
        # The A5.a sales-sheet title block is printed clockwise on portrait A4.
        return card(height, width, project).rotate(-90, expand=True)
    scale = 3
    w, h = max(width * scale, 180), max(height * scale, 150)
    image = Image.new("RGB", (w, h), "#ffffff")
    draw = ImageDraw.Draw(image)
    gold = "#ab8330"
    pad = max(8, int(min(w, h) * .055))
    draw.rectangle((2, 2, w - 3, h - 3), outline=gold, width=max(2, pad // 8))

    if w / h >= 1.35:
        logo_w = int(w * .27)
        logo_h = int(h * .72)
        mark = LOGO.copy()
        mark.thumbnail((logo_w, logo_h), Image.Resampling.LANCZOS)
        image.paste(mark, (pad, (h - mark.height) // 2), mark)
        x = max(pad * 2 + logo_w, int(w * .31))
        available = w - x - pad * 2
        lines = [(project, FONT_BOLD, "#171717"), (PHONE, FONT_REGULAR, "#171717"),
                 (EMAIL, FONT_REGULAR, "#171717"), (WEB, FONT_REGULAR, gold)]
        gap = h * .205
        top = h * .13
        for index, (value, face_path, color) in enumerate(lines):
            face = fitted_font(draw, value, face_path, int(h * .115), available)
            draw.text((x, int(top + index * gap)), value, font=face, fill=color)
    else:
        mark = LOGO.copy()
        mark.thumbnail((int(w * .57), int(h * .27)), Image.Resampling.LANCZOS)
        image.paste(mark, ((w - mark.width) // 2, int(h * .045)), mark)
        lines = [(project, FONT_BOLD, "#171717"), (PHONE, FONT_REGULAR, "#171717"),
                 (EMAIL, FONT_REGULAR, "#171717"), (WEB, FONT_REGULAR, gold)]
        for index, (value, face_path, color) in enumerate(lines):
            face = fitted_font(draw, value, face_path, int(h * .067), w - pad * 2)
            bbox = draw.textbbox((0, 0), value, font=face)
            draw.text(((w - (bbox[2] - bbox[0])) / 2, int(h * (.35 + index * .145))), value, font=face, fill=color)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def stamped_image(source: Path, box: tuple[float, float, float, float], project: str, rotated: bool = False) -> Image.Image:
    image = Image.open(source).convert("RGB")
    x, top, width, height = box
    pixel_box = (round(x * image.width), round(top * image.height),
                 round(width * image.width), round(height * image.height))
    panel = card(pixel_box[2], pixel_box[3], project, rotated)
    image.paste(panel, pixel_box[:2])
    return image


def save_webp(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=91, method=3)


def image_pdf(image: Image.Image, original_pdf: Path | None, destination: Path) -> None:
    if original_pdf:
        page = PdfReader(original_pdf).pages[0]
        size = (float(page.mediabox.width), float(page.mediabox.height))
    else:
        size = (1190.16, 842.04) if image.width > image.height else (595.32, 841.92)
    output = BytesIO()
    jpeg = BytesIO()
    image.save(jpeg, "JPEG", quality=91, subsampling=0)
    jpeg.seek(0)
    pdf = canvas.Canvas(output, pagesize=size, pageCompression=1)
    pdf.drawImage(ImageReader(jpeg), 0, 0, width=size[0], height=size[1])
    pdf.showPage()
    pdf.save()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(output.getvalue())


def render_pdf(source: Path) -> Image.Image:
    with tempfile.TemporaryDirectory() as directory:
        prefix = Path(directory) / "plan"
        # Poppler cannot always access the source drive under the workspace
        # sandbox; stage a read-only copy inside its local temporary directory.
        staged = Path(directory) / "source.pdf"
        shutil.copyfile(source, staged)
        subprocess.run([str(POPPM), "-f", "1", "-l", "1", "-scale-to", "3200",
                        "-singlefile", "-png", str(staged), str(prefix)], check=True, stdout=subprocess.DEVNULL)
        with Image.open(prefix.with_suffix(".png")) as image:
            return image.convert("RGB")


def destinations(group: str, name: str, sample: bool) -> tuple[Path, Path]:
    base = ROOT / "tmp/pdfs/presentation-samples" if sample else PUBLIC / group / "presentation"
    if sample:
        name = group.replace("/", "-") + "-" + name
    return base / f"{name}.webp", base / f"{name}.pdf"


def process_image(source: Path, group: str, template: str, project: str, sample: bool, original_pdf: Path | None = None) -> None:
    image_path, pdf_path = destinations(group, source.stem, sample)
    box = YASSAMINE_RDC_BOXES[source.stem] if template == "yassamine_a123_floor" else BOXES[template]
    image = stamped_image(source, box, project, template == "yassamine_a5_lot")
    save_webp(image, image_path)
    if original_pdf and template == "yassamine_a5_lot":
        # Render the vector master at higher resolution for the PDF copy. This
        # removes the superseded contact text from the PDF content layer.
        rendered = render_pdf(original_pdf)
        x, top, width, height = BOXES[template]
        position = (round(x * rendered.width), round(top * rendered.height))
        panel = card(round(width * rendered.width), round(height * rendered.height), project, rotated=True)
        rendered.paste(panel, position)
        image_pdf(rendered, original_pdf, pdf_path)
    else:
        image_pdf(image, original_pdf, pdf_path)
    print(f"{source.name} -> {image_path.relative_to(ROOT)}")


def process_model(source: Path, sample: bool) -> None:
    image_path, pdf_path = destinations("models/yassamine", source.stem, sample)
    # These PDFs carry /Rotate 270. Stamp the visually rendered page so the
    # cartouche lands at its displayed position, leaving the 3D texture alone.
    original = render_pdf(source)
    box, rotated = MODEL_BOXES[source.stem]
    x, top, width, height = box
    pixel_box = (round(x * original.width), round(top * original.height),
                 round(width * original.width), round(height * original.height))
    original.paste(card(pixel_box[2], pixel_box[3], "Diar El Yassamine", rotated), pixel_box[:2])
    save_webp(original, image_path)
    image_pdf(original, None, pdf_path)
    print(f"{source.name} -> {pdf_path.relative_to(ROOT)}")


def process_a6_apartment(source: Path, sample: bool) -> None:
    """Make a site copy of an A6 sales sheet, preserving its measured-area table."""
    match = re.fullmatch(r"A6\.([ab])-App ([0-4])\.([1-4])", source.stem)
    if not match:
        raise ValueError(f"Unexpected A6 apartment sheet: {source.name}")
    ref = f"A6{match[1]}{match[2]}{match[3]}"
    image_path, pdf_path = destinations("plans/diar-al-yassamine", ref, sample)
    rendered = render_pdf(source)
    x, top, width, height = BOXES["yassamine_a5_lot"]
    position = (round(x * rendered.width), round(top * rendered.height))
    rendered.paste(card(round(width * rendered.width), round(height * rendered.height), "Diar El Yassamine", rotated=True), position)
    save_webp(rendered, image_path)
    image_pdf(rendered, source, pdf_path)
    print(f"{source.name} -> {pdf_path.relative_to(ROOT)}")


def process_a5b_apartment(source: Path, sample: bool) -> None:
    """Make a branded copy of an A5.b sheet without obscuring its area table."""
    match = re.fullmatch(r"A5\.b-App ([0-4])\.([1-5])", source.stem)
    if not match:
        raise ValueError(f"Unexpected A5.b apartment sheet: {source.name}")
    ref = f"A5b{match[1]}{match[2]}"
    image_path, pdf_path = destinations("plans/diar-al-yassamine", ref, sample)
    rendered = render_pdf(source)
    x, top, width, height = BOXES["yassamine_a5_lot"]
    position = (round(x * rendered.width), round(top * rendered.height))
    rendered.paste(card(round(width * rendered.width), round(height * rendered.height), "Diar El Yassamine", rotated=True), position)
    save_webp(rendered, image_path)
    image_pdf(rendered, source, pdf_path)
    print(f"{source.name} -> {pdf_path.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--sample", action="store_true")
    mode.add_argument("--all", action="store_true")
    mode.add_argument("--yassamine-rdc", action="store_true")
    parser.add_argument("--a6-source", type=Path, metavar="DIRECTORY")
    parser.add_argument("--a5b-source", type=Path, metavar="DIRECTORY")
    args = parser.parse_args()
    sample = args.sample
    if args.a5b_source:
        sources = sorted(args.a5b_source.glob("A5.b-App *.pdf"))
        expected = {f"A5.b-App {floor}.{number}.pdf" for floor in range(5) for number in range(1, 6)}
        if {source.name for source in sources} != expected:
            raise ValueError(f"Expected all 25 A5.b sales sheets, found {len(sources)}")
        for source in (sources[:1] if sample else sources):
            process_a5b_apartment(source, sample)
        return
    if args.a6_source:
        sources = sorted(args.a6_source.rglob("A6.[ab]-App *.pdf"))
        if len(sources) != 32:
            raise ValueError(f"Expected 32 A6 apartment sheets, found {len(sources)}")
        for source in (sources[:1] if sample else sources):
            process_a6_apartment(source, sample)
        return
    if args.yassamine_rdc:
        for name in YASSAMINE_RDC_BOXES:
            source = PUBLIC / "plans/diar-al-yassamine" / f"{name}.webp"
            process_image(source, "plans/diar-al-yassamine", "yassamine_a123_floor", "Diar El Yassamine", False)
        return
    if not (args.sample or args.all):
        parser.error("choose --sample, --all, --yassamine-rdc or provide --a5b-source/--a6-source")
    gloire = PUBLIC / "plans/la-gloire"
    source = list(sorted(gloire.glob("[ABCD][0-9][0-9].webp")))
    if len(source) != 102:
        raise ValueError(f"Expected 102 La Gloire apartment previews, got {len(source)}")
    for image in (source[:1] if sample else source):
        process_image(image, "plans/la-gloire", "gloire_lot", "Residence La Gloire", sample, image.with_suffix(".pdf"))
    ensemble = gloire / "ensemble"
    floors = sorted(ensemble.glob("*.webp"))
    if len(floors) != 11:
        raise ValueError(f"Expected 11 La Gloire building plans, got {len(floors)}")
    for image in ([next(p for p in floors if p.name.startswith("PLANCHERDC")), next(p for p in floors if p.name.startswith("PGARDEBLOCA"))] if sample else floors):
        template = "gloire_cover" if image.stem.startswith("PGARDEBLOC") else "gloire_floor"
        process_image(image, "plans/la-gloire/ensemble", template, "Residence La Gloire", sample, image.with_suffix(".pdf"))
    yassamine = PUBLIC / "plans/diar-al-yassamine"
    previews = sorted(yassamine.glob("*.webp"))
    if len(previews) != 30:
        raise ValueError(f"Expected 30 Diar previews, got {len(previews)}")
    if sample:
        previews = [yassamine / name for name in ("A101.webp", "RDC-A1.webp", "A501.webp")]
    for image in previews:
        template = ("yassamine_a123_floor" if image.stem.startswith("RDC-") else
                    "yassamine_a5_lot" if image.with_suffix(".pdf").exists() else "yassamine_a123_lot")
        process_image(image, "plans/diar-al-yassamine", template, "Diar El Yassamine", sample,
                      image.with_suffix(".pdf") if image.with_suffix(".pdf").exists() else None)
    models = sorted((PUBLIC / "models/yassamine").glob("*.pdf"))
    if len(models) != 10:
        raise ValueError(f"Expected 10 Diar building PDFs, got {len(models)}")
    for pdf in (models[:1] if sample else models):
        process_model(pdf, sample)


if __name__ == "__main__":
    main()
