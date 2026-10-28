import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import {Matrix4,Vector3} from 'three';
// Surveyed on the original 6000px ensemble sheets. SketchUp Y points north;
// PDF image rows point south. These anchors are shared by all six sale sheets.
const sx=(725-72)/1050*6000/(140.45673-95.30044);
const sy=(893-230)/1050*6000/(146.88843-100.46371);
const ox=72/1050*6000-sx*95.30044;
const oy=230/1050*6000+sy*146.88843;
const crop={left:Math.floor(sx*94.8+ox),top:Math.floor(oy-sy*147.3),width:Math.ceil(sx*(141.1-94.8)),height:Math.ceil(sy*(147.3-100))};
const bounds={minX:(crop.left-ox)/sx,maxX:(crop.left+crop.width-ox)/sx,minY:(oy-crop.top-crop.height)/sy,maxY:(oy-crop.top)/sy};
const directory='public/models/la-gloire';
const source=`${directory}/la-gloire-web.glb`;
const modelBytes=await fs.readFile(source);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceSha256=hash(modelBytes);
const sources=await Promise.all(Array.from({length:6},async(_,floor)=>{
 const file=floor===0?'PLANCHERDC':`PLANCHE${floor}ETAGE`;
 const path=`public/plans/la-gloire/ensemble/${file}.webp`;
 return {floor,file,path,sha256:hash(await fs.readFile(path))};
}));
const recipe='architect-slab-caps-v1:3072px:q88:original-xy:north-up';
const previous=await fs.readFile(`${directory}/floor-plans.json`,'utf8').then(JSON.parse).catch(()=>null);
if(previous?.recipe===recipe && previous.sourceSha256===sourceSha256 && sources.every((source,i)=>previous.sources[i]?.sha256===source.sha256) && await Promise.all(sources.map(({floor})=>fs.stat(`${directory}/floor-${floor}.webp`).catch(()=>null))).then(files=>files.every(Boolean))) {
 console.log('La Gloire floor caps are up to date.');process.exit(0);
}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const doc=await io.readBinary(modelBytes);
const floors=Array.from({length:6},(_,floor)=>({floor,slabZ:3.5+floor*3.25,triangles:[],keys:new Set(),materials:new Map()}));
for(const node of doc.getRoot().listNodes()){
 const mesh=node.getMesh();if(!mesh)continue;
 const matrix=new Matrix4().fromArray(node.getWorldMatrix());
 for(const primitive of mesh.listPrimitives()){
  if(primitive.getMode()!==4)continue;
  const positions=primitive.getAttribute('POSITION');const idx=primitive.getIndices();const a=new Vector3(),b=new Vector3(),c=new Vector3();
  const point=(i,v)=>v.fromArray(positions.getElement(idx?idx.getScalar(i):i,[])).applyMatrix4(matrix);
  for(let i=0;i<(idx?.getCount()??positions.getCount());i+=3){
   point(i,a);const level=floors.find(level=>Math.abs(a.z-level.slabZ)<.012);if(!level)continue;
   point(i+1,b);point(i+2,c);
   if(Math.abs(b.z-level.slabZ)>.012||Math.abs(c.z-level.slabZ)>.012)continue;
   const x=(a.x+b.x+c.x)/3,y=(a.y+b.y+c.y)/3;
   if(x<88||x>148||y<92||y>157)continue;
   const area=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))*.5;
   if(area<.002)continue;
   const coords=[a,b,c].map(p=>[Number(p.x.toFixed(4)),Number(p.y.toFixed(4))]);
   const key=coords.map(p=>p.join(',')).sort().join(';');if(level.keys.has(key))continue;level.keys.add(key);
   level.triangles.push(...coords.flat());
   const mat=primitive.getMaterial()?.getName()??'';level.materials.set(mat,(level.materials.get(mat)??0)+area);
  }
 }
}
for(const level of floors){
 if(level.triangles.length<600)throw new Error(`Missing architect slab geometry for floor ${level.floor}`);
 // Use the real slab triangles, retaining every opening in those surfaces. Never
 // use a rectangular plane, sales-lot garden footprint or a replacement model.
 delete level.keys;delete level.materials;
 level.capZ=level.slabZ+3.25-.35;
 level.texture=`/models/la-gloire/floor-${level.floor}.webp`;
 const input=sources[level.floor];
 await sharp(input.path).extract(crop).resize(3072,3072,{fit:'fill'}).webp({quality:88,effort:5}).toFile(`public${level.texture}`);
}
await fs.writeFile(`${directory}/floor-plans.json`,JSON.stringify({version:1,recipe,sourceSha256,sources:sources.map(({path,...source})=>source),bounds,crop,floors})+'\n');
console.log(JSON.stringify({floors:floors.length,triangles:floors.map(floor=>floor.triangles.length/6),sourceSha256}));
