"""Check complete lot coverage, file integrity and reviewed layout assignments."""
from pathlib import Path
import hashlib
import json
import re
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / 'public/interiors/la-gloire'
manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))['apartments']
refs = re.findall(r"\['([ABCD]\d{2})'", (root / 'src/lib/lots-la-gloire.ts').read_text(encoding='utf-8'))
assert len(manifest) == len(refs) == 102
assert {item['ref'] for item in manifest} == set(refs)
groups = json.loads((root / 'scripts/interior-layout-groups.json').read_text(encoding='utf-8'))['groups']
mapping = {ref: group[0] for group in groups for ref in group}
for item in manifest:
    ref = item['ref']
    assert item['sourceReference'] == mapping.get(ref, ref), ref
    path = folder / (ref+'.webp')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], ref
    assert (root / f'public/plans/la-gloire/{ref}.pdf').is_file(), ref
    with Image.open(path) as image:
        assert image.size == (item['width'], item['height']), ref
        assert min(image.size) >= 1000, ref
        image.verify()
print('PASS: all 102 apartments have intact interior images, original plans and reviewed layout assignments.')
