const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file){const box={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:box,exports:box.exports});return box.exports;}
const {yassamineLotAtPoint,yassamineA5bPlanCodeAtPoint,mappedYassamineLots,yassamineApartmentHref}=load('src/lib/yassamine-picking.ts');
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
function atB(floor,x,y){
  const data=model.levels.find(l=>l.block==='A5.b'&&l.floors.includes(floor));
  const [[x0,z0],[x1,z1]]=data.textureBounds;
  return yassamineA5bPlanCodeAtPoint({...data,floor},x0+x/(floor?1266:1269)*(x1-x0),z0+y/(floor?1099:1098)*(z1-z0));
}
for(const [x,y,number] of [[500,220,1],[300,850,2],[950,730,3],[750,220,4]])assert.equal(atB(0,x,y),`A5.b-0.${number}`);
for(const [x,y,number] of [[300,850,1],[950,820,2],[1000,430,3],[700,200,4],[500,200,5]])assert.equal(atB(1,x,y),`A5.b-1.${number}`);
assert.equal(atB(4,500,200),'A5.b-4.5','Shared upper-floor drawing must use the selected floor number');
for(const [x,y] of [[450,500],[600,550],[1000,300],[100,420]])assert.equal(atB(0,x,y),undefined,'RDC stairs, courtyard and parking must not show an apartment');
for(const [x,y] of [[450,550],[600,550],[650,620]])assert.equal(atB(1,x,y),undefined,'Upper-floor stairs and landing must not show an apartment');
assert.equal(yassamineA5bPlanCodeAtPoint({...model.levels.find(l=>l.block==='A5.a'),floor:0},0,0),undefined,'A5.a must not receive A5.b labels');
for(const locale of ['fr','ar','en'])assert.equal(yassamineApartmentHref(locale,'A511'),`/${locale}/projets/diar-al-yassamine/appartements/A511`);
console.log('PASS: A5.a lots and A5.b plan labels, common areas excluded, block isolation and FR/AR/EN routes.');
