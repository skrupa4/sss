// Service worker: показывает push-уведомления, когда сайт закрыт или свёрнут.
// Адрес API передаётся параметром ?api=... при регистрации.
const API = new URL(self.location.href).searchParams.get('api');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function showFromServer() {
  const sub = await self.registration.pushManager.getSubscription();
  let data = null;
  if (sub && API) {
    try {
      const res = await fetch(`${API}/api/push/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      data = await res.json();
    } catch { /* нет сети — покажем общее уведомление */ }
  }
  if (!data || data.empty) data = { title: 'SSS', body: 'У вас новое уведомление', url: '#/notifications' };

  // Если сайт открыт и виден, пользователь уже увидел всплывашку внутри приложения — дубль не нужен.
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.some((w) => w.visibilityState === 'visible')) return;

  await self.registration.showNotification(data.title, {
    body: data.body,
    icon: `${self.registration.scope}icon-192.png`,
    badge: `${self.registration.scope}icon-192.png`,
    data: { url: data.url || '#/notifications' },
  });
}

self.addEventListener('push', (event) => event.waitUntil(showFromServer()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = `${self.registration.scope}${event.notification.data?.url || '#/notifications'}`;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((w) => w.url.startsWith(self.registration.scope));
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(target).catch(() => {});
    } else {
      await self.clients.openWindow(target);
    }
  })());
});
