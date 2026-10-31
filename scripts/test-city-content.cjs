const assert=require('node:assert/strict');
const {load}=require('./seo-test-utils.cjs');
const {cityListings,cityFaq,cityTitle,cityDescription}=load('src/lib/city-content.ts');
const address={fr:'Route documentée',en:'Documented road',ar:'عنوان موثق'};
const project={name:'Résidence test',city:'Sfax',address,lots:[
  {ref:'A1',status:'available',sellableArea:90},
  {ref:'A2',status:'sold',sellableArea:180},
  {ref:'A3',status:'reserved',sellableArea:40},
  {ref:'A4',status:'available'},
]};
const data=cityListings([project,{...project,city:'Tunis',lots:[{ref:'T1',status:'available',sellableArea:200}]}],'sfax');
assert.equal(data.projects.length,1);assert.equal(data.available.length,2);assert.equal(data.minArea,90);assert.equal(data.maxArea,90);
assert.equal(cityListings([],'tunis').minArea,undefined);
for(const city of ['sfax','tunis']) for(const locale of ['fr','ar','en']) {
  assert(cityTitle(city,locale).length<60);
  assert(cityDescription(city,locale).length<155);
  const faq=cityFaq(city,locale,data);
  assert(faq.length>=3 && faq.length<=5);
  assert(faq[0].answer.includes(address[locale]));
  assert(!JSON.stringify(faq).includes('180'),'Sold areas cannot enter available range');
  for(const item of faq) assert(item.question && item.answer);
}
console.log('PASS: pages locales, filtre ville/statut, surfaces connues, FAQ et limites des métadonnées.');
