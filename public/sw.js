// Basic Service Worker
const CACHE_NAME = 'app-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple pass-through fetch handler is enough to satisfy the PWA installability requirement
  event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});
