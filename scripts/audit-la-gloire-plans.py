"""Verify that every published preview matches its lot and original PDF."""
import hashlib
import json
from pathlib import Path
import re
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else None
directory = root / 'public/plans/la-gloire'
manifest = json.loads((directory / 'sources.json').read_text(encoding='utf-8'))
refs = re.findall(r"\['([ABCD]\d{2})'", (root / 'src/lib/lots-la-gloire.ts').read_text(encoding='utf-8'))
assert len(refs) == 102 and {p['ref'] for p in manifest['plans']} == set(refs)
for plan in manifest['plans']:
    ref = plan['ref']
    assert hashlib.sha256((directory / f'{ref}.pdf').read_bytes()).hexdigest() == plan['sha256']
    if source:
        assert hashlib.sha256((source / plan['source']).read_bytes()).hexdigest() == plan['sha256']
    with Image.open(directory / f'{ref}.webp') as preview:
        assert preview.size == (plan['width'], plan['height'])
        preview.verify()
assert len(list((directory / 'ensemble').glob('*.pdf'))) == 11
for document in (directory / 'ensemble').glob('*.pdf'):
    with Image.open(document.with_suffix('.webp')) as preview:
        assert max(preview.size) >= 6000, f'{document.name}: preview too small'
        preview.verify()
if source:
    for original in source.rglob('*.pdf'):
        if original.stem in refs:
            continue
        assert hashlib.sha256(original.read_bytes()).digest() == hashlib.sha256((directory / 'ensemble' / original.name).read_bytes()).digest()
print('PASS: 102 lot references, saved PDF hashes and decoded previews; 11 building documents with high-resolution previews.')
if source:
    print('PASS: published PDFs match the source directory byte for byte.')
