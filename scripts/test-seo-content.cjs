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

(async () => {
  const {GET}=load('src/app/robots.txt/route.ts');
  const response=GET();
  assert.equal(response.status,200);
  assert(response.headers.get('content-type').startsWith('text/plain'));
  const robots=await response.text();
  assert(robots.includes('Content-Signal: search=yes, ai-input=yes, ai-train=yes'));
  assert(robots.includes('Sitemap: '+SITE.url+'/sitemap.xml'));
  const groups=robots.trim().split(/\n\s*\n/).filter(group=>/^User-agent:/m.test(group));
  assert.equal(groups.length,2);
  for(const group of groups) {
    assert(group.includes('Content-Signal: search=yes, ai-input=yes, ai-train=yes'));
    for(const restricted of ['/api/','/*/admin','/*/espace-client','/*/connexion','/*/inscription']) assert(group.includes('Disallow: '+restricted));
  }
  for(const bot of ['Googlebot','Bingbot','GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-SearchBot','Claude-User','PerplexityBot','Perplexity-User','Google-Extended','Applebot-Extended']) assert(robots.includes('User-agent: '+bot));
  console.log('PASS: règles des robots et exclusions privées dans chaque groupe.');
})().catch(error=>{console.error(error);process.exitCode=1;});
