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
    assert(response.headers.get('link')?.includes('</llms.txt>; rel="describedby"'));
    assert(response.headers.get('link')?.includes('</sitemap.xml>; rel="sitemap"'));
    console.log(`PASS: /${locale}, ${scripts.length} scripts JSON-LD, canonical et quatre hreflang dans le HTML serveur.`);
  }
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
    const {response}=await get(path);
    assert(response.headers.get('x-robots-tag')?.includes('noindex'),path);
  }
  console.log('PASS: accès bots, routes texte, vraies 404, protection CAD/PDF et espaces privés.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
