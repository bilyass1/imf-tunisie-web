"""Compress reviewed interior illustrations for web delivery, without resizing."""
from pathlib import Path
import json
import sys
import re
import shutil
import hashlib
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
output = root / 'public/interiors/la-gloire'
output.mkdir(parents=True, exist_ok=True)
items = json.loads((root / 'scripts/interior-renders.json').read_text(encoding='utf-8-sig'))
published = []
groups = json.loads((root / 'scripts/interior-layout-groups.json').read_text(encoding='utf-8'))['groups']
for item in items:
    with Image.open(source / item['file']) as image:
        image.convert('RGB').save(output / (item['ref']+'.webp'), quality=94, method=6)
        dimensions = image.size
    published.append({'ref': item['ref'], 'sourceReference': item['ref'], 'width': dimensions[0], 'height': dimensions[1], 'sourceImage': item['file']})
    print(item['ref'])
for group in groups:
    base = next((item for item in published if item['ref'] == group[0]), None)
    if base is None:
        continue
    for ref in group[1:]:
        shutil.copyfile(output / (group[0]+'.webp'), output / (ref+'.webp'))
        published.append({**base, 'ref': ref})
refs = set(re.findall(r"\['([ABCD]\d{2})'", (root / 'src/lib/lots-la-gloire.ts').read_text(encoding='utf-8')))
assert {item['ref'] for item in published} == refs, f"Missing interiors: {refs - {item['ref'] for item in published}}"
for item in published:
    item['sha256'] = hashlib.sha256((output / (item['ref']+'.webp')).read_bytes()).hexdigest()
(output / 'manifest.json').write_text(json.dumps({'type': 'Illustrative furnished 3D cutaways', 'style': 'Contemporary luxury: light stone, dark wood, gold accents', 'apartments': sorted(published, key=lambda item: item['ref'])}, indent=2)+'\n', encoding='utf-8')
print(f'Published {len(published)} apartments from {len(items)} reviewed layouts.')
