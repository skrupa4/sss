import { useSyncExternalStore } from 'react';

// Мини-роутер на location.hash: работает на GitHub Pages без настройки сервера.
function subscribe(cb) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

const getHash = () => window.location.hash.replace(/^#/, '') || '/feed';

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getHash);
  const [path] = hash.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { path, page: parts[0] || 'feed', param: parts[1] || null };
}

export function navigate(path) {
  window.location.hash = path;
  window.scrollTo({ top: 0 });
}

export const profilePath = (username) => `/profile/${encodeURIComponent(username)}`;
export const messagesPath = (username) => (username ? `/messages/${encodeURIComponent(username)}` : '/messages');
export const clanPath = (id) => `/clans/${id}`;
