const assert = require('node:assert/strict');
const {load} = require('./seo-test-utils.cjs');
const {organization,apartmentSchema,projectSchema,projectBreadcrumbs,jsonLd,socialProfiles}=load('src/lib/seo.ts');
const {SITE}=load('src/lib/site.ts');
const localized={fr:'Adresse documentée',ar:'عنوان موثق',en:'Documented address'};
const lot={ref:'A1',code:'A 1',floor:0,typology:'S+2',sellableArea:90,status:'available',price:200000};
const project={slug:'test',name:'Résidence test',city:'Sfax',address:localized,description:localized,cover:'/cover.jpg',heroImage:'/hero.jpg',gallery:[],lots:[
  lot,{...lot,ref:'A2',price:undefined},{...lot,ref:'A3',status:'sold',price:100000},
  {...lot,ref:'A4',price:300000},{...lot,ref:'A5',status:'reserved',price:50000},
]};
const apartment=JSON.parse(jsonLd(apartmentSchema(project,lot,'fr')));
assert(apartment['@type'].includes('Apartment'));
assert(apartment['@type'].includes('Product'));
assert.equal(apartment.offers.price,200000);
assert.equal(apartment.floorLevel,'0');
assert.equal(apartment.numberOfRooms,3);
assert.equal(apartment.numberOfBedrooms,2);
assert.deepEqual(apartment.floorSize,{'@type':'QuantitativeValue',value:90,unitCode:'MTK'});
assert.equal(apartment.offers.availability,'https://schema.org/InStock');
assert.equal(apartment.offers.priceCurrency,'TND');
const sold=apartmentSchema(project,{...lot,status:'sold',price:undefined},'fr');
assert.equal(sold['@type'],'Apartment');
assert.equal(sold.offers.availability,'https://schema.org/SoldOut');
assert.equal(sold.offers.price,undefined);
assert.equal(apartmentSchema(project,{...lot,status:'sold'},'fr')['@type'],'Apartment');
assert.equal(apartmentSchema(project,{...lot,price:undefined},'fr')['@type'],'Apartment');
assert.equal(apartmentSchema(project,{...lot,status:'reserved'},'fr')['@type'],'Apartment');
const unknown=apartmentSchema(project,{...lot,status:'unconfirmed',price:undefined,sellableArea:undefined,typology:'Non documenté'},'fr');
assert.equal(unknown.offers,undefined);assert.equal(unknown.floorSize,undefined);assert.equal(unknown.numberOfRooms,undefined);
for(const price of [undefined,NaN,Infinity,-1,0]) {
  const unpriced=apartmentSchema(project,{...lot,price},'fr');
  assert.equal(unpriced.offers,undefined);
  assert.equal(unpriced['@type'],'Apartment');
}
function checkProducts(graph) {
  for(const node of graph.filter(node=>[].concat(node['@type']).includes('Product'))) {
    assert.equal(node.offers?.priceCurrency,'TND');
    if(node.offers['@type']==='AggregateOffer') {
      // Residences retain their documented aggregate range, as required by
      // Google's AggregateOffer shape; never invent a price for the whole block.
      assert(node.offers.lowPrice>0 && node.offers.highPrice>=node.offers.lowPrice);
    } else {
      assert(Number.isFinite(node.offers.price) && node.offers.price>0);
      assert.equal(node.offers.availability,'https://schema.org/InStock');
    }
  }
}
for(const locale of ['fr','ar','en']) {
  const graph=JSON.parse(jsonLd(projectSchema(project,locale)))['@graph'];
  const residence=graph[0];
  checkProducts(graph);
  assert.equal(graph.filter(node=>[].concat(node['@type']).includes('Apartment') && [].concat(node['@type']).includes('Product')).length,2);
  assert.equal(residence.offers.lowPrice,200000);
  assert.equal(residence.offers.highPrice,300000);
  assert.equal(residence.offers.offerCount,3);
  assert.equal(residence.numberOfAccommodationUnits,undefined,'Do not confuse partial catalog with programme total');
  assert.equal(residence.containsPlace.length,5);
  for(const ref of residence.containsPlace) assert(graph.some(node=>node['@id']===ref['@id']));
  assert.equal(projectBreadcrumbs(project,locale,lot).itemListElement.length,4);
}
const unpricedResidence=projectSchema({...project,lots:[{...lot,price:undefined}]},'fr')['@graph'][0];
assert.equal(unpricedResidence.offers,undefined);
assert.equal(unpricedResidence['@type'],'ApartmentComplex');
assert.equal(projectSchema({...project,slug:'diar-al-yassamine'},'fr')['@graph'][0].numberOfAccommodationUnits.value,177);
assert.equal(organization.department.length,2);
assert.equal(organization.image,`${SITE.url}/media/imf/siege.jpg`);
assert.equal(organization.geo,undefined);assert.equal(organization.foundingDate,undefined);assert.equal(organization.openingHoursSpecification,undefined);
assert.equal(socialProfiles(['https://facebook.com/','https://instagram.com/?fake=page','invalid','https://linkedin.com/']).length,0);
assert.equal(socialProfiles(['https://www.facebook.com/example-page']).length,1);
assert(!jsonLd({name:'</script>'}).includes('<'));

async function checkHtml(origin) {
  for(const path of ['/fr','/ar/projets/diar-al-yassamine','/en/projets/residence-la-gloire','/fr/projets/residence-la-gloire/appartements/A43']) {
    const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,path);
    const html=await response.text();
    const graph=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match=>{
      const data=JSON.parse(match[1]);return data['@graph']||[data];
    });
    checkProducts(graph);
    assert(graph.some(node=>node['@type']==='RealEstateAgent'),path);
    if(path.includes('/projets/')) {
      assert(graph.some(node=>node['@type']==='BreadcrumbList'),path);
      const apartments=graph.filter(node=>[].concat(node['@type']).includes('Apartment'));
      assert(apartments.length>0,path);
      for(const apartment of apartments) {
        assert(apartment['@id'] && apartment.name && apartment.address);
        assert.equal(typeof apartment.floorLevel,'string');
        if(apartment.floorSize) assert.equal(apartment.floorSize.unitCode,'MTK');
        if(apartment.offers?.price) assert.equal(apartment.offers.priceCurrency,'TND');
      }
    }
  }
  console.log('PASS: JSON-LD parsé depuis le HTML serveur des pages clés.');
}
console.log('PASS: schémas résidences/lots, prix documentés, SoldOut, références, fil d’Ariane et organisation.');
if(process.argv[2]) checkHtml(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1;});
