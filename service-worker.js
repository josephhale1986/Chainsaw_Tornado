self.addEventListener('install', e=>{
  e.waitUntil(caches.open('ct-atlas-v2').then(c=>c.addAll([
    './','./index.html','./game.js','./manifest.webmanifest'
  ])));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});