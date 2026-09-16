"""Extract plan vectors for the interactive A5/A6 model. Requires PyMuPDF/Shapely.

Coordinates below are surveyed on 1600px full-page previews. Wall polygons come
directly from PDF fills, not image generation. Heights are illustrative because
the supplied sales sheets contain no elevations/sections.
"""
from pathlib import Path
import sys, json, hashlib, shutil
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tmp/cad-tools'))
import pymupdf as fitz
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import affine_transform

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv)>1 else Path('E:/5-PROJET__DIAR AL YASSAMINE')
OUT = ROOT / 'public/models/yassamine'
OUT.mkdir(parents=True, exist_ok=True)

# Outline, shared alignment datum, drawing calibration (pixels per model metre).
# A5 joins at the party wall; A6 joins at the common axis between side balconies.
SPECS = [
 ('A5a-0','RDC A5.a','A5.a',[0], [834,174],36, [[168,174],[834,174],[834,378],[686,378],[686,676],[834,676],[834,882],[606,882],[606,857],[440,857],[440,908],[283,908],[177,829],[177,738],[181,621],[275,621],[275,657],[385,657],[385,564],[177,564],[177,288],[168,288]]),
 ('A5a-1','ETAGE A5.a','A5.a',[1,2,3,4],[835,205],32.9, [[130,266],[150,227],[185,194],[250,194],[250,160],[550,160],[550,205],[835,205],[835,410],[685,410],[685,710],[835,710],[835,913],[606,913],[606,889],[495,889],[495,938],[312,938],[312,900],[132,900]]),
 ('A5b-0','RDC A5.b','A5.b',[0],[264,174],36, [[264,174],[1029,174],[1105,244],[1105,297],[852,297],[852,449],[1105,449],[1105,706],[1110,706],[1110,842],[1043,906],[674,906],[674,784],[606,784],[606,882],[264,882],[264,676],[407,676],[407,378],[264,378]]),
 ('A5b-1','ETAGE A5.b','A5.b',[1,2,3,4],[198,181],32.9, [[198,181],[884,181],[884,217],[1004,217],[1038,252],[1038,578],[1002,578],[1002,714],[1042,714],[1042,849],[979,914],[605,914],[605,866],[434,866],[434,890],[198,890],[198,686],[347,686],[347,383],[198,383]]),
 ('A6a-0','RDC A6.a','A6.a',[0],[1056,382],39.6, [[145,119],[971,119],[971,185],[1035,185],[1035,661],[971,661],[971,666],[849,666],[849,682],[720,682],[720,701],[271,701],[271,665],[145,665]]),
 ('A6a-1','1er+2eme+3eme A6.a','A6.a',[1,2,3],[1078,540],41.9, [[82,198],[851,198],[851,244],[990,244],[990,323],[1055,323],[1055,745],[990,745],[990,850],[851,850],[851,869],[653,869],[653,890],[220,890],[220,850],[82,850]]),
 ('A6a-4','4eme A6.a','A6.a',[4],[1078,540],41.9, [[82,198],[851,198],[851,244],[990,244],[990,323],[1055,323],[1055,745],[990,745],[990,783],[810,783],[810,801],[650,812],[540,819],[415,831],[246,840],[246,850],[103,850],[82,525]]),
 ('A6b-0','RDC A6.b','A6.b',[0],[231,397],39.6, [[314,132],[1006,132],[1006,529],[942,529],[942,666],[812,666],[812,634],[616,634],[588,660],[490,660],[490,711],[314,711],[314,632],[255,632],[255,197],[314,197]]),
 ('A6b-1','1er A6.b','A6.b',[1],[177,555],41.9, [[270,217],[959,217],[959,783],[676,816],[458,816],[458,837],[270,837],[270,766],[205,766],[205,343],[270,343]]),
 ('A6b-2','2eme+3eme A6.b','A6.b',[2,3],[177,555],41.9, [[270,217],[959,217],[959,783],[676,816],[458,816],[458,837],[270,837],[270,766],[205,766],[205,343],[270,343]]),
]

def polygons(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [p for x in g.geoms for p in polygons(x)] if hasattr(g,'geoms') else []

def encode(g):
    return [{'outer': [[round(x,3),round(y,3)] for x,y in p.exterior.coords][:-1],
             'holes': [[[round(x,3),round(y,3)] for x,y in r.coords][:-1] for r in p.interiors]}
            for p in polygons(g) if p.area>.003]

result={'version':1,'heightEstimated':True,'floorHeight':3.0,'slabHeight':.22,'levels':[], 'sources':[]}
for ident,stem,block,floors,anchor,ppm,outline in SPECS:
    if block.startswith('A5'):
        ppm=36.5
    if ident=='A6b-1':
        outline=[[x,y-20] for x,y in outline]
        anchor=[anchor[0],anchor[1]-20]
    source=next((SOURCE / ('VENTE__PARCELLE A5' if block.startswith('A5') else 'VENTE__PARCELLE A6')).rglob(stem+'.pdf'), OUT/(ident+'.pdf'))
    source_bytes=source.read_bytes()
    doc=fitz.open(stream=source_bytes,filetype='pdf');page=doc[0]
    if ident=='A6b-0': page.set_rotation(270)
    transform=page.rotation_matrix * fitz.Matrix(1600/page.rect.width,1600/page.rect.width)
    envelope=Polygon(outline).buffer(0)
    filled=[]; columns=[]; labels=[]; gray=[]; balcony_points=[]
    for b in page.get_text('dict')['blocks']:
        for ln in b.get('lines',[]):
            for span in ln['spans']:
                if span['text'].strip()=='BALCON':
                    r=fitz.Rect(span['bbox'])*transform
                    from shapely.geometry import Point
                    balcony_points.append(Point((r.x0+r.x1)/2,(r.y0+r.y1)/2))
                if span['text'].startswith(('A5-','A6-','A5 -','A6 -')):
                    r=fitz.Rect(span['bbox'])*transform
                    labels.append(box(r.x0-1,r.y0-1,r.x1+1,r.y1+1))
    label_mask=unary_union(labels)
    for d in page.get_drawings():
        color=d['fill']
        if color is None: continue
        colored=max(color)-min(color)>.18
        black=max(color)<.05
        is_gray=max(color)-min(color)<.02 and .5<max(color)<.95
        if not (colored or black or is_gray):continue
        points=[]
        for item in d['items']:
            if item[0]=='l':points.extend([item[1],item[2]])
            elif item[0]=='re':
                r=item[1];points.extend([r.tl,r.tr,r.br,r.bl])
            elif item[0]=='qu':points.extend([item[1].ul,item[1].ur,item[1].lr,item[1].ll])
        if len(points)<3:continue
        coords=[tuple(p*transform) for p in points]
        poly=Polygon(coords).buffer(0)
        if poly.is_empty:continue
        if is_gray:
            gray.append(poly.intersection(envelope))
        elif colored:
            poly=poly.difference(label_mask).intersection(envelope)
            if poly.area>1:filled.append(poly)
        elif poly.area>25 and poly.area<650 and len(points)<=12:
            # Solid structural columns, excluding tiny lettering and furniture.
            if poly.intersects(envelope):columns.append(poly.intersection(envelope))
    walls=unary_union(filled)
    # Keep black columns only where they meet a coloured wall.
    near=walls.buffer(8)
    walls=unary_union([walls]+[p for p in columns if p.intersects(near)])
    walls=walls.buffer(.12).buffer(-.12).simplify(.18,preserve_topology=True)
    balconies=unary_union([p for p in polygons(unary_union(gray).buffer(.25))
                          if any(p.buffer(3).contains(pt) for pt in balcony_points)])
    # Openings are gaps between actual wall fills along surveyed perimeter edges.
    openings=[]
    for a,b in zip(outline,outline[1:]+outline[:1]):
        edge=LineString([a,b]);length=edge.length
        if length<ppm*.6:continue
        dx=(b[0]-a[0])/length;dy=(b[1]-a[1])/length
        intervals=[]
        for p in polygons(walls.intersection(edge.buffer(6))):
            ts=[max(0,min(length,(x-a[0])*dx+(y-a[1])*dy)) for x,y in p.exterior.coords]
            intervals.append((min(ts),max(ts)))
        intervals.sort();merged=[]
        for lo,hi in intervals:
            if merged and lo<=merged[-1][1]+3:merged[-1][1]=max(hi,merged[-1][1])
            else:merged.append([lo,hi])
        # Only bounded gaps: a blank edge alone is not evidence of a window.
        for before,after in zip(merged,merged[1:]):
            lo,hi=before[1],after[0]
            if .48*ppm<hi-lo<2.5*ppm:
                openings.append([[a[0]+dx*lo,a[1]+dy*lo],[a[0]+dx*hi,a[1]+dy*hi]])
    matrix=[1/ppm,0,0,1/ppm,-anchor[0]/ppm,-anchor[1]/ppm]
    def local(p):return [round((p[0]-anchor[0])/ppm,3),round((p[1]-anchor[1])/ppm,3)]
    pdf_name=ident+'.pdf';(OUT/pdf_name).write_bytes(source_bytes)
    # A crop texture retains the original plan for cutaway inspection.
    bounds=envelope.bounds
    full=page.get_pixmap(matrix=fitz.Matrix(2400/page.rect.width,2400/page.rect.width),alpha=False).pil_image()
    crop=full.crop(tuple(round(v*1.5) for v in bounds))
    crop.save(OUT/(ident+'.webp'),'WEBP',quality=92)
    result['levels'].append({'id':ident,'block':block,'floors':floors,
        'outline':encode(affine_transform(envelope,matrix)),
        'walls':encode(affine_transform(walls,matrix)),
        'balconies':encode(affine_transform(balconies,matrix)),
        'openings':[[local(a),local(b)] for a,b in openings],
        'plan':'/models/yassamine/'+ident+'.webp','pdf':'/models/yassamine/'+pdf_name,
        'textureBounds':[local(bounds[:2]),local(bounds[2:])],
        'source':stem+'.pdf'})
    result['sources'].append({'file':stem+'.pdf','sha256':hashlib.sha256(source_bytes).hexdigest()})
    print(ident,'wall polygons',len(encode(walls)),'openings',len(openings),flush=True)
(OUT/'model.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8')
print('Wrote',OUT/'model.json')
