"""Import the 20 individual A5.a sales plans supplied by the owner.

Usage: python scripts/import-yassamine-a5a-plans.py "<A5.a source folder>"
Requires pypdfium2 and Pillow. The PDF originals are copied unchanged.
"""

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

import pypdfium2 as pdfium


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) == 2 else None
if not SOURCE or not SOURCE.is_dir():
    raise SystemExit('Provide the A5.a folder containing the 20 individual sales PDFs.')

files = sorted(SOURCE.glob('A5.a-App *.pdf'))
if len(files) != 20:
    raise SystemExit(f'Expected 20 individual PDFs, found {len(files)}.')

output = ROOT / 'public/plans/diar-al-yassamine'
output.mkdir(parents=True, exist_ok=True)
records = []
for original in files:
    match = re.fullmatch(r'A5\.a-App ([0-4])\.([1-4])\.pdf', original.name)
    if not match:
        raise SystemExit(f'Unexpected filename: {original.name}')
    ref = f'A5{match[1]}{match[2]}'
    document = pdfium.PdfDocument(str(original))
    if len(document) != 1:
        raise SystemExit(f'Expected one page: {original.name}')
    pdf_target = output / f'{ref}.pdf'
    web_target = output / f'{ref}.webp'
    shutil.copyfile(original, pdf_target)
    image = document[0].render(scale=2.4).to_pil().convert('RGB')
    image.save(web_target, 'WEBP', quality=88, method=6)
    records.append({
        'ref': ref,
        'sourceFile': original.name,
        'pdfSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
        'pdf': f'/plans/diar-al-yassamine/{ref}.pdf',
        'preview': f'/plans/diar-al-yassamine/{ref}.webp',
    })

(ROOT / 'docs/yassamine-a5a-source-files.json').write_text(
    json.dumps({'areaLabels': ['Surface hors-oeuvre', 'Surface du plancher'],
                'sourceQualifier': 'Surface approximative', 'plans': records},
               ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(records)} individual A5.a plans.')
