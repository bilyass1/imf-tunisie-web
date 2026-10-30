const assert=require('node:assert/strict');
const {load}=require('./seo-test-utils.cjs');
const {publicMarkdownPath,acceptsMarkdown}=load('src/lib/markdown-routing.ts');
const {markdownPage}=load('src/lib/markdown-content.ts');
const localized={fr:'Texte français',en:'English content',ar:'محتوى عربي'};
const project={slug:'test',name:'Projet réel',city:'Sfax',address:localized,description:localized,status:'ongoing',highlights:[localized],specs:[],lots:[
  {ref:'A1',code:'A 1',typology:'S+2',status:'available',floor:0,sellableArea:90,reservationNote:'PRIVATE_SENTINEL'},
  {ref:'A2',code:'A 2',typology:'S+1',status:'sold',floor:1,price:123456},
]};
assert(acceptsMarkdown('text/markdown'));
assert(acceptsMarkdown('text/html;q=0.5, text/markdown; charset=utf-8'));
for(const accept of ['text/html','*/*','text/markdown;q=0','text/markdown;q=bad','text/markdown;q=0.2, text/html']) assert(!acceptsMarkdown(accept));
for(const path of ['/fr/admin','/fr/admin/lots','/fr/espace-client','/fr/connexion','/fr/inscription','/api/media/1','/fr/projets/test/plans/private.pdf','/fr/projets/test/../admin','/fr/%61dmin','/fr/projets/test/appartements/A1/admin']) {
  assert.equal(publicMarkdownPath(path),null,path);
  assert.equal(markdownPage(path,[project]),null,path);
}
for(const locale of ['fr','en','ar']) {
  for(const path of ['', '/contact','/projets','/projets/test','/projets/test/appartements/A1','/projets/test/appartements/A2','/guides','/appartements-sfax','/appartements-tunis']) {
    const text=markdownPage(`/${locale}${path}`,[project]);
    assert(text?.startsWith('# '),path);
    assert(!text.includes('PRIVATE_SENTINEL'),path);
  }
}
assert.equal(markdownPage('/fr/projets/absent',[project]),null);
assert.equal(markdownPage('/fr/projets/test/appartements/absent',[project]),null);
assert(!markdownPage('/fr/projets/test',[project]).includes('123456'));
const {NextRequest}=require('next/server');
const {middleware}=load('src/middleware.ts');
for(const path of ['/llms.txt','/llms-full.txt','/robots.txt']) {
  const response=middleware(new NextRequest('https://example.test'+path));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('location'),null);
}
for(const path of ['/fr','/fr/projets/test','/fr/guides','/ar/appartements-sfax']) {
  const response=middleware(new NextRequest('https://example.test'+path,{headers:{accept:'text/markdown'}}));
  assert(response.headers.get('x-middleware-rewrite')?.includes('/api/markdown?path='),path);
  assert(response.headers.get('content-security-policy').includes("'nonce-"));
  assert(response.headers.get('vary').includes('Accept'));
}
for(const path of ['/fr/admin','/fr/espace-client','/fr/connexion','/fr/inscription']) {
  const response=middleware(new NextRequest('https://example.test'+path,{headers:{accept:'text/markdown'}}));
  assert.equal(response.headers.get('x-middleware-rewrite'),null);
  assert(response.headers.get('x-robots-tag').includes('noindex'));
}
const rsc=middleware(new NextRequest('https://example.test/fr',{headers:{accept:'text/markdown',rsc:'1'}}));
assert.equal(rsc.headers.get('x-middleware-rewrite'),null);
const filtered=middleware(new NextRequest('https://example.test/fr/contact?project=test',{headers:{accept:'text/markdown'}}));
assert.equal(filtered.headers.get('x-robots-tag'),'noindex, follow');
console.log('PASS: négociation Markdown, contenu public, chemins privés refusés, CSP, Vary et RSC préservés.');
