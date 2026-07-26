// MedField Service Worker for Web Push Notifications

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'MedField Admin';
    const options = {
      body: data.body || 'You have a new notification.',
      icon: data.icon || '/vite.svg',
      badge: '/vite.svg',
      vibrate: [100, 50, 100],
      data: data.data || { url: '/' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[Service Worker] Error parsing push data', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
