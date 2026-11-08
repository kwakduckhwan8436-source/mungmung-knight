// 멍멍기사 디펜스 - 오프라인 캐시 (네트워크 우선: 새 버전이 항상 먼저, 오프라인일 때만 캐시)
const CACHE = 'mmk-v1.6.0';
const FILES = ['./', './index.html', './js/audio.js?v=1.6.0', './js/art.js?v=1.6.0', './js/story.js?v=1.6.0', './js/story2.js?v=1.6.0', './js/story3.js?v=1.6.0', './js/lore.js?v=1.6.0', './js/story4.js?v=1.6.0', './js/story5.js?v=1.6.0', './js/story6.js?v=1.6.0', './js/story7.js?v=1.6.0', './js/story8.js?v=1.6.0', './js/story9.js?v=1.6.0', './js/story10.js?v=1.6.0', './js/story11.js?v=1.6.0', './js/story_plus.js?v=1.6.0', './js/lore2.js?v=1.6.0', './art/artpack.js?v=1.6.0', './art/title.jpg', './js/game.js?v=1.6.0', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)).catch(() => {}); return r; }).catch(() => caches.match(e.request)));
});
