"""Import the 102 original sales plans and render faithful web previews."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import pypdfium2 as pdfium

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
destination = root / 'public/plans/la-gloire'
refs = re.findall(r"\['([ABCD]\d{2})'", (root / 'src/lib/lots-la-gloire.ts').read_text(encoding='utf-8'))
sources = {p.stem: p for p in args.source.glob('BLOC*/*.pdf') if re.fullmatch(r'[ABCD]\d{2}', p.stem)}
assert set(refs) == set(sources), f'Missing: {set(refs)-set(sources)}; extra: {set(sources)-set(refs)}'
destination.mkdir(parents=True, exist_ok=True)
manifest = []
for ref in refs:
    source = sources[ref]
    pdf_path = destination / f'{ref}.pdf'
    shutil.copy2(source, pdf_path)
    with pdfium.PdfDocument(str(source)) as document:
        assert len(document) == 1, f'{ref}: expected one page'
        page = document[0]
        bitmap = page.render(scale=3600/max(page.get_size()))
        preview = bitmap.to_pil().convert('RGB')
        preview.save(destination / f'{ref}.webp', 'WEBP', quality=94, method=6)
        manifest.append({'ref': ref, 'source': source.relative_to(args.source).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'width': preview.width, 'height': preview.height})
        bitmap.close()
        page.close()
    print(ref, flush=True)
(destination / 'sources.json').write_text(json.dumps({'edition': '13.02.2026', 'plans': manifest}, indent=2)+'\n', encoding='utf-8')
ensemble = destination / 'ensemble'
ensemble.mkdir(exist_ok=True)
for original in args.source.rglob('*.pdf'):
    if original.stem not in sources:
        shutil.copy2(original, ensemble / original.name)
print(f'Imported and rendered {len(manifest)} plans.')
