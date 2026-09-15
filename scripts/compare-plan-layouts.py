"""Read-only layout comparison to identify candidates for visual review, not approval."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

directory = Path(__file__).resolve().parents[1] / 'public/plans/la-gloire'
masks = {}
for file in directory.glob('*.webp'):
    image = Image.open(file).convert('RGB')
    array = np.array(image)[:int(image.height*.96), :int(image.width*.68)].astype(int)
    red, green, blue = array[:,:,0], array[:,:,1], array[:,:,2]
    walls = (red < 60) & (green < 100) & (blue < 110) & (green > red+7) & (blue > red+7)
    y, x = np.where(walls)
    box = (int(x.min()), int(y.min()), int(x.max()+1), int(y.max()+1))
    masks[file.stem] = np.array(Image.fromarray(walls.astype('uint8')*255).crop(box).resize((256,256))) > 100
groups = []
for ref in sorted(masks):
    match = None
    for group in groups:
        a,b = masks[ref],masks[group[0]]
        score = np.logical_and(a,b).sum()/np.logical_or(a,b).sum()
        if score > .95:
            match = group
            break
    if match is None: groups.append([ref])
    else: match.append(ref)
print(json.dumps(groups))
