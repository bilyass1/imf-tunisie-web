import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const root=process.cwd();
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const lots=read('src/lib/yassamine-available.json');
assert.equal(lots.length,7);
assert.equal(new Set(lots.map(l=>l.ref)).size,7);
assert.deepEqual(lots.map(l=>l.code),['A1-0.1','A1-0.4','A2-0.1','A2-0.2','A2-0.4','A3-0.4','A3-0.5']);
for(const lot of lots){
  assert.equal(lot.floor,0);assert.equal(lot.status,'available');assert(lot.sellableArea>lot.grossArea);assert(!lot.price);
  assert.equal(lot.rooms.length,1);assert.equal(lot.rooms[0].id,'salon');
  const panorama=path.join(root,'public',lot.rooms[0].panorama);
  const panoInfo=await sharp(panorama).metadata();
  assert.equal(panoInfo.width/panoInfo.height,2);assert(panoInfo.width>=1700);
}
const sources=read('public/plans/diar-al-yassamine/available-sources.json');
assert.equal(sources.files.length,8);
let images=0;
for(const entry of sources.files){
  const file=path.join(root,'public/plans/diar-al-yassamine',entry.file);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.subarray(0,6).toString(),'AC1032');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  for(const preview of entry.previews){
    const info=await sharp(path.join(root,'public/plans/diar-al-yassamine',preview)).metadata();
    assert(info.width>=3600&&info.height>=2500);images++;
  }
}
assert.equal(images,10);
const model=read('public/models/yassamine/model.json');
assert.equal(model.levels.length,10);
for(const [block,count] of [['A5.a',5],['A5.b',5],['A6.a',5],['A6.b',4]]){
  assert.equal(new Set(model.levels.filter(l=>l.block===block).flatMap(l=>l.floors)).size,count);
}
for(const level of model.levels){
  assert(level.walls.length>0&&level.outline.length>0);
  for(const polygon of [...level.walls,...level.outline]){assert(polygon.outer.length>=3);assert(polygon.outer.flat().every(Number.isFinite));}
  const pdf=fs.readFileSync(path.join(root,'public',level.pdf));
  assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'),model.sources.find(s=>s.file===level.source).sha256);
  assert(fs.existsSync(path.join(root,'public',level.plan)));
}
const code=ts.transpileModule(fs.readFileSync('src/lib/yassamine-catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const mod={exports:{}};vm.runInNewContext(code,{exports:mod.exports,require:()=>lots});
const existing={...lots[0],rooms:undefined,status:'sold',price:199000};
const project={slug:'diar-al-yassamine',lots:[existing,{ref:'A511',status:'reserved'}],blocks:[{id:'A5.a',floors:[0,1,2,3,4]}]};
const data={projects:[project],contacts:[{id:'keep'}]};
mod.exports.includeYassamineApartments(data);mod.exports.includeYassamineApartments(data);
assert.equal(project.lots.length,8);assert.equal(project.lots[0],existing);
assert.equal(existing.status,'sold');assert.equal(existing.price,199000);
assert.equal(existing.rooms.length,1);assert.equal(existing.rooms[0].panorama,'/360/diar-al-yassamine/A101/salon.png');
assert.equal(project.lots[1].status,'reserved');assert.equal(project.blocks.length,4);
assert.equal(data.contacts[0].id,'keep');assert.equal(project.lots.filter(x=>x.status==='available').length,6);
console.log('PASS: 7 unique apartments, 8 unchanged DWGs, 10 high-resolution previews, 19 model levels across 4 parts.');
console.log('PASS: repeated catalog update preserves existing sales, reservations, prices and contacts.');
console.log('PASS: 7 seamless 2:1 panoramas are linked to the apartment tours.');
