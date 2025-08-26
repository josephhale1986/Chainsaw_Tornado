self.addEventListener('install', e=>{
  e.waitUntil(caches.open('ct-final-fix').then(c=>c.addAll([
    './','./index.html','./game.js','./manifest.webmanifest',
    './assets/bgm_main.wav','./assets/bgm_boss.wav','./assets/menu.png'
  ])));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});