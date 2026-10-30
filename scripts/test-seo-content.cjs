const assert = require('node:assert/strict');
const {load} = require('./seo-test-utils.cjs');
const {llmsText} = load('src/lib/agent-content.ts');
const {SITE} = load('src/lib/site.ts');
const localized = {fr:'Texte réel',ar:'نص حقيقي',en:'Real content'};
const project = {slug:'test',name:'Projet réel',city:'Sfax',address:localized,description:localized,status:'ongoing',lots:[
  {ref:'A1',code:'A 1',typology:'S+2',sellableArea:90,floor:0,status:'available',reservationNote:'PRIVATE_SENTINEL'},
  {ref:'A2',code:'A 2',typology:'S+1',sellableArea:60,floor:1,status:'sold',price:123456},
  {ref:'A3',code:'A 3',typology:'S+3',floor:2,status:'available',price:234567},
]};
const compact = llmsText([project]);
const full = llmsText([project], true);
assert(compact.startsWith(`# ${SITE.name} — ${SITE.legalName}\n`));
for (const locale of ['fr','ar','en']) assert(compact.includes(`${SITE.url}/${locale}/projets/test`));
assert(full.includes('90 m²') && full.includes('234567 TND'));
assert(!full.includes('123456') && !full.includes('PRIVATE_SENTINEL'));
assert(!compact.includes('/appartements/A1'));
assert(full.includes('/appartements/A1') && !full.includes('/appartements/A2'));
assert(full.includes('BH Bank') && full.includes('###'));
assert(!llmsText([{...project,lots:[]}],true).includes('234567'));
console.log('PASS: textes IA multilingues, lots disponibles, prix connus et données privées absentes.');
