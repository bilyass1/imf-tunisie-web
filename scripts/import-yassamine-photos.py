"""Publish the reviewed photorealistic edits without changing the real photos."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('generated_directory', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
selection = json.loads((root / 'scripts/yassamine-photo-renders.json').read_text(encoding='utf-8'))
destination = root / 'public/media/diar-al-yassamine'
expected = {'hero', *[f'3d-{i}' for i in range(2, 9)], 'bloc-a123', 'bloc-a5', 'bloc-a6', 'bloc-a7'}
assert {item['outputFile'] for item in selection['images']} == expected
assert len(selection['images']) == 12
untouched = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in destination.glob('*.jpg') if p.stem not in expected}
manifest = []
for item in selection['images']:
    source = args.generated_directory / item['generatedFile']
    target = destination / (item['outputFile'] + '.jpg')
    with Image.open(source) as image:
        image = image.convert('RGB')
        assert image.width >= 1600 and image.height >= 900
        image.save(target, 'JPEG', quality=95, subsampling=0, optimize=True)
        manifest.append({**item, 'width': image.width, 'height': image.height, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
for path, original_hash in untouched.items():
    assert hashlib.sha256(path.read_bytes()).hexdigest() == original_hash
(destination / 'photorealistic-manifest.json').write_text(json.dumps({'mode': 'built-in image_gen edit', 'images': manifest}, indent=2)+'\n', encoding='utf-8')
print(f'Published {len(manifest)} perspectives; {len(untouched)} real photos unchanged.')
