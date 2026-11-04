'use strict';
const CACHE='agency-visits-shell-v5.0',BASE=new URL('./',self.location.href);
const FILES=['./','index.html','planner.js?v=5.0','app.js?v=5.0','sync.js?v=2.2','pwa.js?v=5.0','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new URL(path,BASE).href))));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('agency-visits-shell-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Never cache Supabase/API responses or other apps on this GitHub Pages origin.
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(new URL('./',BASE).href,copy)))}return response}).catch(async()=>await caches.match(new URL('./',BASE).href)||Response.error()));return;
 }
 const allowed=FILES.some(file=>new URL(file,BASE).pathname===url.pathname);if(!allowed)return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}return response}).catch(()=>caches.match(request)));
});
