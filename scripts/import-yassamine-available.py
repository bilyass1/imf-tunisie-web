"""Import the seven user-confirmed unsold A1/A2/A3 lots and render DWG plans.

Local prerequisites: LibreDWG 0.14 (DWG -> DXF), ezdxf + PyMuPDF.
The original DWGs are preserved byte-for-byte. Web images render modelspace
inside the original sheet frames; unrelated paperspace templates are excluded.
"""
from pathlib import Path
import sys, json, hashlib, io, re, subprocess, copy
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tmp/cad-tools'))
import ezdxf
from ezdxf.addons.drawing import Frontend, RenderContext, layout, config
from ezdxf.addons.drawing.pymupdf import PyMuPdfBackend
from ezdxf.math import BoundingBox2d
from PIL import Image

SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path('C:/Users/yassi/Downloads')
OUT=ROOT/'public/plans/diar-al-yassamine'
OUT.mkdir(parents=True,exist_ok=True)
TEMP=ROOT/'tmp/dwg-previews';TEMP.mkdir(parents=True,exist_ok=True)
CODES=['A1-0.1','A1-0.4','A2-0.1','A2-0.2','A2-0.4','A3-0.4','A3-0.5']
# Confirmed against the apartment area tables AND the PLAN RDC summary tables.
# Surface du plancher is recorded as sellableArea; hors-oeuvre separately.
DATA=[('S+3',85.85,95.86,104.97,15.89),('S+3',81.01,90.46,None,15.89),
      ('S+3',81.49,91.45,100.12,15.89),('S+3',80.78,90.66,98.54,15.89),
      ('S+3',80.59,90.44,None,15.89),('S+2',64.32,72.04,99.04,None),
      ('S+3',80.83,90.54,95.60,15.89)]
manifest=[];lots=[]
for index,name in enumerate(CODES+['PLAN RDC']):
    original=SOURCE/(name+'.dwg');ref=name.replace('-','').replace('.','') if name!='PLAN RDC' else 'RDC-A123'
    raw=original.read_bytes();assert raw[:6]==b'AC1032'
    target=OUT/(ref+'.dwg')
    if not target.exists() or hashlib.sha256(target.read_bytes()).digest()!=hashlib.sha256(raw).digest():
        target.write_bytes(raw)
    dxf=TEMP/(name+'.dxf')
    if not dxf.exists():
        with (TEMP/(name+'-conversion.log')).open('w') as log:
            subprocess.run([str(ROOT/'tmp/libredwg/dwg2dxf.exe'),'-v0','-o',str(dxf),str(original)],check=True,stdout=log,stderr=log)
    doc=ezdxf.readfile(dxf);space=doc.modelspace();frames=[]
    for e in space.query('LWPOLYLINE'):
        pts=list(e.get_points());xs=[float(p[0]) for p in pts];ys=[float(p[1]) for p in pts]
        w=max(xs)-min(xs);h=max(ys)-min(ys)
        if len(pts)<6 and w>20 and h>10:frames.append((min(xs),min(ys),max(xs),max(ys)))
    assert frames, name
    frames=sorted(frames,key=lambda b:(b[2]-b[0])*(b[3]-b[1]),reverse=True)
    selections=[(ref,frames[0])] if name!='PLAN RDC' else [(f'RDC-A{i+1}',b) for i,b in enumerate(sorted(frames))]
    recorded=PyMuPdfBackend()
    cfg=config.Configuration(background_policy=config.BackgroundPolicy.WHITE,color_policy=config.ColorPolicy.COLOR)
    Frontend(RenderContext(doc),recorded,config=cfg).draw_layout(space,finalize=True)
    for output,coords in selections:
        backend=copy.deepcopy(recorded) if len(selections)>1 else recorded
        x0,y0,x1,y1=coords
        image=Image.open(io.BytesIO(backend.get_pixmap_bytes(layout.Page(420,297,layout.Units.mm),dpi=220,
            render_box=BoundingBox2d([(x0-.08,y0-.08),(x1+.08,y1+.08)])))).convert('RGB')
        image.save(OUT/(output+'.webp'),'WEBP',quality=94,method=6)
        print(output,image.size,flush=True)
    manifest.append({'file':ref+'.dwg','source':original.name,'sha256':hashlib.sha256(raw).hexdigest(),
                     'previews':[s[0]+'.webp' for s in selections]})
    if index<len(CODES):
        typology,gross,sellable,garden,terrace=DATA[index]
        texts=[e.dxf.text if e.dxftype()=='TEXT' else e.plain_text() for e in space.query('TEXT MTEXT')]
        assert any(name.replace('A','A.',1) in t and 'APPARTEMENT' in t for t in texts)
        assert any(typology==t.strip() for t in texts)
        assert any(f'{sellable:.2f}' in t for t in texts)
        lot={'ref':ref,'code':name,'block':name[:2],'floor':0,'typology':typology,'grossArea':gross,
             'sellableArea':sellable,'status':'available','planImage':f'/plans/diar-al-yassamine/{ref}.webp',
             'planDwgUrl':f'/plans/diar-al-yassamine/{ref}.dwg'}
        if garden is not None:lot['gardenArea']=garden
        if terrace is not None:lot['terraceArea']=terrace
        lots.append(lot)
(OUT/'available-sources.json').write_text(json.dumps({'conversion':'LibreDWG 0.14 + ezdxf; modelspace sheet frames',
 'statusSource':'User confirmed unsold apartments','files':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'src/lib/yassamine-available.json').write_text(json.dumps(lots,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Imported seven available apartments and three ground-floor sheets.')
