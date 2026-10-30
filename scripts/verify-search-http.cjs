const assert = require('node:assert/strict');
const {load} = require('./seo-test-utils.cjs');
const {SITE} = load('src/lib/site.ts');
const origin = process.argv[2] || 'http://localhost:3000';
async function get(path, headers = {}) {
  const response = await fetch(origin + path, {headers, redirect:'manual',signal:AbortSignal.timeout(30000)});
  const body = await response.text();
  return {response,body};
}
async function main() {
  for (const [agent,path] of [['GPTBot/1.1','/fr'],['ClaudeBot/1.0','/fr'],['PerplexityBot/1.0','/robots.txt']]) {
    const {response,body}=await get(path,{'User-Agent':agent});
    assert.equal(response.status,200,`${agent} ${path}`);
    assert(body.length>0);
  }
  for (const locale of ['fr','ar','en']) {
    const {response,body}=await get(`/${locale}`);
    assert.equal(response.status,200);
    const scripts=[...body.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    assert(scripts.length>=1,`${locale}: JSON-LD absent du HTML brut`);
    for(const script of scripts) JSON.parse(script[1]);
    const languages=[...body.matchAll(/hreflang="([^"]+)"/gi)].map(m=>m[1]);
    for(const language of ['fr','ar','en','x-default']) assert(languages.includes(language),`${locale}: ${language}`);
    assert(body.includes(`rel="canonical" href="${SITE.url}/${locale}"`));
    assert.equal((body.match(/<h1\b/g)||[]).length,1);
    assert(response.headers.get('content-security-policy').includes("'nonce-"));
    assert(/\baccept\b/i.test(response.headers.get('vary')));
    assert(response.headers.get('link')?.includes('</llms.txt>; rel="describedby"'));
    assert(response.headers.get('link')?.includes('</sitemap.xml>; rel="sitemap"'));
    console.log(`PASS: /${locale}, ${scripts.length} scripts JSON-LD, canonical et quatre hreflang dans le HTML serveur.`);
  }
  for(const locale of ['fr','ar','en']) for(const city of ['sfax','tunis']) {
    const path=`/${locale}/appartements-${city}`;
    const {response,body}=await get(path);
    assert.equal(response.status,200,path);
    assert(body.includes(`rel="canonical" href="${SITE.url}${path}"`));
    assert.equal((body.match(/<h1\b/g)||[]).length,1,path);
    assert(body.includes('FAQPage') && body.includes('BreadcrumbList'),path);
    assert((body.match(/<title>([^<]+)<\/title>/)?.[1]||'').length<60,path);
    assert((body.match(/<meta name="description" content="([^"]*)"/)?.[1]||'').length<155,path);
  }
  for(const path of ['/fr','/ar','/en','/fr/projets','/ar/projets/diar-al-yassamine','/en/projets/residence-la-gloire/appartements/A43','/fr/guides','/fr/guides/foprolos-questions-banque-premier-logement','/fr/contact','/ar/appartements-sfax']) {
    const {response,body}=await get(path,{Accept:'text/markdown'});
    assert.equal(response.status,200,path);
    assert(response.headers.get('content-type').startsWith('text/markdown'),path);
    assert(/\baccept\b/i.test(response.headers.get('vary')));
    assert(body.startsWith('# ') && !body.includes('<script'),path);
  }
  const htmlDefault=await get('/fr',{Accept:'text/markdown;q=0, text/html'});
  assert(htmlDefault.response.headers.get('content-type').startsWith('text/html'));
  for(const path of ['/api/markdown?path=%2Ffr%2Fadmin','/api/markdown?path=%2Ffr%2Fespace-client','/fr/projets/absent']) {
    assert.equal((await get(path,{Accept:'text/markdown'})).response.status,404,path);
  }
  const filteredMarkdown=await get('/fr/contact?project=test',{Accept:'text/markdown'});
  assert.equal(filteredMarkdown.response.headers.get('x-robots-tag'),'noindex, follow');
  const filteredHtml=await get('/fr/recherche?minPrice=100000');
  assert(/<meta name="robots" content="[^"]*noindex/.test(filteredHtml.body));
  console.log('PASS: six pages locales, Markdown public, Vary Accept, refus des routes privées et noindex filtré.');
  for(const path of ['/llms.txt','/llms-full.txt','/robots.txt','/sitemap.xml']) {
    const {response,body}=await get(path);
    assert.equal(response.status,200,path);
    assert(body.includes(SITE.url),path);
    if(path.startsWith('/llms')) {
      assert(response.headers.get('content-type').includes('text/plain'));
      assert.equal(response.headers.get('cache-control'),'public, max-age=3600, s-maxage=3600');
    }
    if(path==='/robots.txt') assert(body.includes('Content-Signal: search=yes, ai-input=yes, ai-train=yes'));
    if(path==='/sitemap.xml') {
      const urls=[...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
      assert(urls.length>0);
      assert(urls.every(url=>url.startsWith(SITE.url+'/')));
      console.log(`PASS: sitemap, ${urls.length} URL sur le domaine officiel.`);
    }
  }
  const missing=await get('/fr/projets/projet-inexistant');
  assert.equal(missing.response.status,404);
  for(const path of ['/test.dwg','/test.skp','/non-approuve.pdf']) assert.equal((await get(path)).response.status,404,path);
  for(const path of ['/fr/connexion','/fr/inscription','/fr/admin','/fr/espace-client']) {
    const {response}=await get(path,{Accept:'text/markdown'});
    assert(response.headers.get('x-robots-tag')?.includes('noindex'),path);
    assert(!response.headers.get('content-type')?.includes('text/markdown'),path);
  }
  console.log('PASS: accès bots, routes texte, vraies 404, protection CAD/PDF et espaces privés.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
