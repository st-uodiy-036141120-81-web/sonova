const SHELL = 'sonova-v8';
const AUDIO = 'sonova-audio-v1';
const ASSETS = ['/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== AUDIO).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isAppShell(url) {
  return url.endsWith('/') || url.includes('/index.html') || url.includes('/assets/');
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  if (/\.(mp3|mp4|mpeg|m4a)(\?|$)/i.test(url)) {
    e.respondWith(
      caches.open(AUDIO).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch {
          return cached ?? Response.error();
        }
      })
    );
    return;
  }

  // HTML + JS: network first so env/config updates reach users after deploy
  if (isAppShell(url)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && url.includes('/index.html')) {
            caches.open(SHELL).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((c) => c ?? caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

self.addEventListener('push', (e) => {
  const data = e.data?.json?.() ?? { title: 'Sonova', body: 'New activity' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  let url = e.notification.data?.url ?? '/';
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    url = '/';
  }
  e.waitUntil(clients.openWindow(url));
});
