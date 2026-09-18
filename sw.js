// 煤炭进销存 Service Worker：让 Chrome 识别为可安装 App（离线缓存 + 安装能力）
const CACHE = 'coal-erp-v1';
// 需要预缓存的入口页（离线可用核心入口）
const PRECACHE = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).catch(() => {})
  );
});
self.addEventListener('activate', (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).catch(() => {})
  );
});
self.addEventListener('fetch', (e) => {
  // 网络优先，失败回退缓存（保证数据始终从云端/服务器最新读取）
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      if (e.request.method === 'GET' && res && res.status === 200) {
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || fetch(e.request)))
  );
});
