self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // required to trigger PWA install prompt
})

self.addEventListener('push', (e) => {
  let data = { title: 'اجازاتي', body: '' }
  try {
    if (e.data) data = e.data.json()
  } catch { /* */ }

  const options = {
    body: data.body || '',
    icon: '/icon-512.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
  }

  e.waitUntil(self.registration.showNotification(data.title || 'اجازاتي', options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    if (clients.length > 0) {
      return clients[0].focus()
    }
    return self.clients.openWindow('/')
  }))
})
