const CACHE_NAME = 'cinepwa-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/offline.html'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[CinePWA SW] Pré-armazenando shell da aplicação em cache...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass completo em desenvolvimento local para evitar que assets antigos do Vite fiquem travados
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.pathname.includes('/@vite/') || url.pathname.includes('/src/')) {
    return;
  }

  // REGRA ESTRITA: NÃO armazenar arquivos de vídeo, fluxos de mídia ou requisições de áudio no cache offline
  if (
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.webm') ||
    event.request.headers.get('range') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    // Busca direto pela rede sem intermediar cache
    return;
  }

  // Estratégia Stale-While-Revalidate para ativos estáticos da UI
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            event.request.method === 'GET'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se a rede falhar e for navegação HTML, retornar a página offline
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
