// 一度ひらけば、機内（オフライン）でも動くように全部を保存しておく
var CACHE = 'sora-quiz-v5';
var FILES = ['./', 'index.html', 'app.js', 'data.js', 'english.js', 'manifest.json', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // えいごの こえ（audio/en/*.m4a）の いちらんは precache.json に ある
    return fetch('precache.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (audio) { return c.addAll(FILES.concat(audio)); });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request); }));
});
