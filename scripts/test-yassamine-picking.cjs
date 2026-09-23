const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file){const box={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:box,exports:box.exports});return box.exports;}
const {yassamineLotAtPoint,mappedYassamineLots,yassamineApartmentHref}=load('src/lib/yassamine-picking.ts');
const {YASSAMINE_A5A_LOTS}=load('src/lib/lots-la-gloire.ts');
const lots=YASSAMINE_A5A_LOTS.map(([code])=>({code,ref:code.replace(/[.\-]/g,''),block:'A5.a',floor:Number(code.charAt(3))}));
const model=JSON.parse(fs.readFileSync('public/models/yassamine/model.json','utf8'));
function at(floor,x,y,block='A5.a',catalogue=lots){
  const data=model.levels.find(l=>l.block===block&&l.floors.includes(floor));
  const [[x0,z0],[x1,z1]]=data.textureBounds;
  return yassamineLotAtPoint({...data,floor},x0+x/(floor?1057:999)*(x1-x0),z0+y/(floor?1167:1101)*(z1-z0),catalogue)?.ref;
}
for(let floor=0;floor<=4;floor++){
  const centres=floor?[[550,300],[310,300],[280,800],[550,810]]:[[520,240],[110,270],[270,840],[520,800]];
  centres.forEach(([x,y],i)=>assert.equal(at(floor,x,y),`A5${floor}${i+1}`));
  for(const [x,y] of (floor?[[410,550],[580,620],[940,520],[940,720]]:[[360,450],[520,530],[870,400],[870,650]]))assert.equal(at(floor,x,y),undefined,'Common areas and courtyards must not redirect');
}
assert.equal(mappedYassamineLots(lots).length,20);
assert.equal(at(0,520,240,'A5.a',lots.filter(l=>l.ref!=='A501')),undefined,'Missing catalogue entry must not create a broken link');
assert.equal(at(0,520,240,'A5.b'),undefined,'No fallback to another block');
assert.equal(at(0,-100,-100),undefined);
for(const locale of ['fr','ar','en'])assert.equal(yassamineApartmentHref(locale,'A511'),`/${locale}/projets/diar-al-yassamine/appartements/A511`);
console.log('PASS: 20 apartment masks, stairs/courtyards excluded, missing records, block isolation and FR/AR/EN routes.');
