self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('ct-v1').then(c=>c.addAll([
    './',
    './index.html',
    './game.js',
    './manifest.webmanifest',
    './favicon.png',
    './icons/icon-192.png',
    './icons/icon-256.png',
    './icons/icon-384.png',
    './icons/icon-512.png'
  ])));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});
