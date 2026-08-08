const CACHE_NAME = 'pinthip-cache-v20260809-2';

// ติดตั้ง Service Worker ใหม่และข้ามสถานะรอ (Skip Waiting) ทันที
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// เคลียร์แคชเก่าที่หมดอายุออกทันทีเมื่อมีการเปิดใช้งานเวอร์ชันใหม่
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ดึงข้อมูลเว็บสดๆ เสมอ เพื่อให้หน้าเว็บเป็นเวอร์ชันล่าสุด
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
