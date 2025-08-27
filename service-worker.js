self.addEventListener('install', e=>{
  e.waitUntil(caches.open('ct-arcade').then(c=>c.addAll([
    './','./index.html','./game.js','./manifest.webmanifest',
    './assets/bgm_main.wav','./assets/bgm_boss.wav','./assets/menu.png',
    './assets/chainsaw_idle.wav','./assets/chainsaw_swing.wav','./assets/axe_throw.wav',
    './assets/axe_hit.wav','./assets/tornado_whoosh.wav','./assets/despawn_puff.wav',
    './assets/titan_charge.wav','./assets/bolt_fire.wav','./assets/aoe_burst.wav',
    './assets/boss_eye_open.wav','./assets/mini_spawn.wav','./assets/boss_crit.wav',
    './assets/boss_bar_slam.wav','./assets/enrage_loop.wav',
    './assets/lumberjack_sprites.png','./assets/tornado_minion.png','./assets/tornado_zig.png',
    './assets/storm_titan.png','./assets/hurricane_lord.png'
  ])));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});