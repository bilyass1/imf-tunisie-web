"""Render the original building PDFs for the website's HTML plan viewer."""
from pathlib import Path
import pypdfium2 as pdfium

directory = Path(__file__).resolve().parents[1] / 'public/plans/la-gloire/ensemble'
for source in sorted(directory.glob('*.pdf')):
    with pdfium.PdfDocument(str(source)) as document:
        assert len(document) == 1, f'{source.name}: expected one page'
        page = document[0]
        bitmap = page.render(scale=6000 / max(page.get_size()))
        preview = bitmap.to_pil().convert('RGB')
        preview.save(source.with_suffix('.webp'), 'WEBP', quality=95, method=6)
        print(source.stem, preview.size, flush=True)
        bitmap.close()
        page.close()
