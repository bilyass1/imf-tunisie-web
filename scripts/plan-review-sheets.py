"""Read-only source-plan contact sheets for checking repeated-floor geometry."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / 'tmp/plan-review'
out.mkdir(parents=True, exist_ok=True)
for block, count in [('A',4),('B',4),('C',5),('D',6)]:
    for unit in range(1,count+1):
        sheet = Image.new('RGB',(2400,1250),'white')
        draw = ImageDraw.Draw(sheet)
        for col, floor in enumerate([2,3,4]):
            ref = f'{block}{floor}{unit}'
            im = Image.open(root / f'public/plans/la-gloire/{ref}.webp').convert('RGB')
            a=np.array(im)[:int(im.height*.96),:int(im.width*.68)].astype(int)
            r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
            walls=(r<60)&(g<100)&(b<110)&(g>r+7)&(b>r+7)
            y,x=np.where(walls)
            im=im.crop((max(0,int(x.min())-100),max(0,int(y.min())-120),min(im.width,int(x.max())+120),min(im.height,int(y.max())+140)))
            im.thumbnail((780,1200))
            sheet.paste(im,(col*800+(800-im.width)//2,40))
            draw.text((col*800+380,12),ref,fill='black')
        sheet.save(out / f'{block}2{unit}.jpg',quality=96)
