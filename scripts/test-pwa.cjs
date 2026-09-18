const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const handlers={};let offline=false;let cacheReads=0;
const cached=new Response('offline page');
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{
  URL,Response,self:{location:{origin:'https://imf.test'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}},
  caches:{open:async()=>({addAll:async()=>{},match:async()=>{cacheReads++;return cached;}}),keys:async()=>['imf-public-v1'],delete:async()=>true},
  fetch:async()=>{if(offline) throw new Error('offline');return new Response('network');}
});
function request(path,method='GET',mode='cors') {let response;handlers.fetch({request:{url:'https://imf.test'+path,method,mode},respondWith:r=>response=r});return response;}
(async()=>{
  for(const p of ['/api/media/contract','/api/chat-revision','/fr/admin?_rsc=1','/_next/static/chunk.js']) assert.equal(request(p),undefined);
  assert.equal(request('/fr/admin','POST'),undefined);
  assert.equal(await (await request('/fr/admin','GET','navigate')).text(),'network');
  assert.equal(cacheReads,0);
  offline=true;
  assert.equal(await (await request('/fr/espace-client/documents','GET','navigate')).text(),'offline page');
  assert.equal(request('/api/media/contract'),undefined);
  assert.ok(await request('/pwa/icon-192.png'));
  console.log('PASS: offline fallback, no private/API/RSC/POST caching, public asset allowlist.');
})().catch(error=>{console.error(error);process.exitCode=1;});
