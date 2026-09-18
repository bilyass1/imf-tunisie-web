/* Only explicitly listed public assets are cached. Never cache sessions, API,
   HTML pages, RSC responses, contracts, photos or POST requests. */
const CACHE='imf-public-v1';
const ASSETS=['/offline.html','/pwa/icon-192.png','/pwa/icon-512.png','/pwa/maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('imf-public-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin) return;
  if(request.mode==='navigate') {
    event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/offline.html')).then(response=>response||new Response('Connexion indisponible',{status:503}))));
  } else if(ASSETS.includes(url.pathname)&&!url.search) {
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
  }
});
