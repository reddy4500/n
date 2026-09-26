// Service worker: offline app shell. API calls always go to the network.
const CACHE = 'neetpg-ai-v1';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/store.js', 'js/syllabus.js', 'js/bank.js', 'js/gemini.js', 'js/ui.js', 'js/stats.js', 'js/questions.js',
  'js/voice.js', 'js/nav.js', 'js/quiz.js', 'js/mentor.js', 'js/cards.js', 'js/daily.js', 'js/plan.js', 'js/home.js',
  'js/settings.js', 'js/theme.js', 'js/commands.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // network-first so updates pushed to GitHub show up; fall back to cache offline
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const route = e.notification.data?.route || 'home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { c.focus(); c.postMessage({ route }); return; }
    return self.clients.openWindow(`./#/${route}`);
  }));
});
