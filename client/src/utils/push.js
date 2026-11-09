import { API_BASE, api } from '../api/client';

const OFF_KEY = 'sss_push_off';      // пользователь сам выключил — не включаем обратно молча
const DISMISS_KEY = 'sss_push_dismissed'; // когда закрыли баннер с просьбой
const DISMISS_DAYS = 3;

const swUrl = `${import.meta.env.BASE_URL}sw.js?api=${encodeURIComponent(API_BASE)}`;

const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* приватный режим */ } };

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// На iPhone push работает только у сайта, добавленного на экран «Домой».
export const needsInstall = () => isIOS() && !isStandalone();

export const pushDismissedRecently = () => {
  const at = Number(read(DISMISS_KEY));
  return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
};
export const dismissPushPrompt = () => write(DISMISS_KEY, String(Date.now()));

function keyToBytes(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function registration() {
  await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  try { return await (await registration()).pushManager.getSubscription(); } catch { return null; }
}

async function subscribeAndReport() {
  const reg = await registration();
  const { publicKey } = await api.get('/api/push/key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
    } catch (err) {
      if (err.name !== 'InvalidStateError') throw err;
      // Ключ сервера сменился — старая подписка не подходит, пересоздаём.
      await (await reg.pushManager.getSubscription())?.unsubscribe();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
    }
  }
  await api.post('/api/push/subscribe', { endpoint: sub.endpoint });
}

/** Вызывать только из обработчика клика: браузер требует жест пользователя для запроса разрешения. */
export async function enablePush() {
  if (!pushSupported()) throw new Error('Этот браузер не поддерживает уведомления');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    if (permission === 'default') dismissPushPrompt();
    return permission;
  }
  write(OFF_KEY, null);
  await subscribeAndReport();
  return 'granted';
}

export async function disablePush() {
  write(OFF_KEY, '1');
  const sub = await currentSubscription();
  if (!sub) return;
  await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

/** При входе: если разрешение уже выдано, молча привязываем это устройство к текущему аккаунту. */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted' || read(OFF_KEY)) return;
  try { await subscribeAndReport(); } catch { /* не критично: повторим при следующем входе */ }
}
