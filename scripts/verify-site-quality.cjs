const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = process.argv[2] || 'http://127.0.0.1:3108';
async function main() {
  const results = [];
  for (const locale of ['fr', 'en', 'ar']) {
    for (const route of ['', '/recherche', '/selection', '/guides', '/contact', '/projets/residence-zephyr', '/projets/residence-la-gloire/appartements/B02', '/projets/residence-la-gloire/appartements/A43']) {
      const path = `/${locale}${route}`;
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      assert.equal(response.status, 200, path);
      assert(!html.includes('Application error:'), path);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (route !== '/selection') assert.equal(canonical, `https://imf-immobilere.tn${path}`, path);
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
      if (route.endsWith('/B02')) assert(description.includes('360°'), path);
      if (route.endsWith('/A43')) assert(!description.includes('360°'), path);
      if (route === '/selection') assert(/<meta name="robots" content="[^"]*noindex/.test(html), path);
      results.push({path,status:response.status,canonical});
    }
    const filtered = await (await fetch(`${origin}/${locale}/recherche?minPrice=100000`)).text();
    assert(/<meta name="robots" content="[^"]*noindex/.test(filtered), 'Filtered results must not be indexed');
  }
  for (const path of ['/robots.txt','/sitemap.xml','/llms.txt']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    results.push({path,status:response.status});
  }
  fs.writeFileSync('docs/site-quality-check-20260923.json', JSON.stringify({ origin, scope:'Local production HTTP checks, not public PageSpeed or ranking measurements', results, filteredSearchNoindex:true, apartmentTourMetadata:true }, null, 2));
  console.log(`PASS: ${results.length} production routes; canonicals, filtered search noindex and truthful 360 metadata in FR/EN/AR.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
