// service-worker.js - PWA simplificada (sin caché)
self.addEventListener('install', function (event) {
  console.log('✅ Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  console.log('✅ Service Worker activado');
});

/*
self.addEventListener('fetch', function (event) {
  // Siempre pedir al servidor, sin caché
  event.respondWith(fetch(event.request));
});
*/
// Con network first!
self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request).catch(function () {
      return new Response('Sin conexión al servidor', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
