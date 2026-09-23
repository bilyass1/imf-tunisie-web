const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file){
  const box={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{module:box,exports:box.exports,require,Date,URLSearchParams});return box.exports;
}
const {filterProperties,defaultFilters,readFilters,propertyListings,visitHref}=load('src/lib/property-search.ts');
const listings=propertyListings([{slug:'test',name:'Résidence test',city:'Tunis',address:{fr:'El Aouina'},mapQuery:'Tunis',cover:'/test.jpg',lots:[
  {ref:'A1',code:'A 1',typology:'S+2',status:'available',sellableArea:90,price:200000,floor:1},
  {ref:'A2',code:'A 2',typology:'S+1',status:'reserved',sellableArea:60,price:120000,floor:0},
  {ref:'A3',code:'A 3',typology:'S+3',status:'available',sellableArea:120,floor:2},
  {ref:'A4',code:'A 4',typology:'S+2',status:'sold',sellableArea:90,price:220000,floor:3},
]}],'fr');
const match=patch=>filterProperties(listings,{...defaultFilters,...patch}).map(l=>l.ref).join(',');
assert.equal(match({}),'A1,A3');
assert.equal(match({q:'residence',minPrice:'180000',maxPrice:'200000',minArea:'90',maxArea:'90',bedrooms:'2'}),'A1');
assert.equal(match({maxPrice:'250000'}),'A1','Unknown prices must not pass a budget filter');
assert.equal(match({status:'',sort:'price-desc'}),'A4,A1,A2,A3','Unknown prices sort last in either direction');
assert.equal(match({minArea:'150',maxArea:'80'}),'');
assert.equal(match({project:'missing'}),'');
assert.equal(match({status:'sold'}),'A4');
assert.equal(readFilters(new URLSearchParams('minPrice=-3&maxArea=NaN&status=bad')).status,'available');
assert.equal(readFilters(new URLSearchParams('status=')).status,'');
assert.equal(visitHref('fr','test','A1'),'/fr/contact?intent=visit&project=test&lot=A1');
const {validVisitRequest,visitDateBounds}=load('src/lib/visit-request.ts');
assert.equal(visitDateBounds(new Date('2026-09-23T23:30:00Z')).min, '2026-09-24', 'Calendar uses Tunis date, not visitor timezone');
assert.equal(visitDateBounds(new Date('2026-09-23T23:30:00Z')).max, '2027-03-23');
const now=new Date('2026-09-20T12:00:00Z');
assert(validVisitRequest({date:'2026-09-21',time:'10:30',mode:'video'},now));
assert(!validVisitRequest({date:'2026-09-20',time:'12:30',mode:'onsite'},now),'Tunis is UTC+1');
assert(!validVisitRequest({date:'2026-09-31',time:'10:30',mode:'onsite'},now));
assert(!validVisitRequest({date:'2027-09-21',time:'10:30',mode:'video'},now));
assert(!validVisitRequest({date:'2026-09-21',time:'99:00',mode:'video'},now));
assert(!validVisitRequest({date:'2026-09-21',time:'10:00',mode:'other'},now));
const {propertyGuides}=load('src/lib/property-guides.ts');
assert.equal(new Set(propertyGuides.map(g=>g.slug)).size,propertyGuides.length);
for(const guide of propertyGuides)for(const locale of ['fr','en','ar']){
  assert(guide.title[locale]&&guide.summary[locale]);
  assert(guide.sections.length>=4);
  for(const section of guide.sections)assert(section.body[locale].length>100);
}
console.log('PASS: combined filters, unknown prices, sorting, invalid ranges, visit timezone/date validation, translated guides.');
