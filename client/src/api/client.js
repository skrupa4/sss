// Единая точка общения с сервером: токен, таймаут и нормальные ошибки.
// Адрес API можно переопределить переменной VITE_API_URL при сборке.
export const API_BASE = (import.meta.env.VITE_API_URL || 'https://sss-backend-haev.onrender.com').replace(/\/$/, '');

const TOKEN_KEY = 'sss_token';
// Бесплатный Render «просыпается» до ~30 секунд, поэтому таймаут с запасом.
const TIMEOUT_MS = 35_000;

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* приватный режим */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* приватный режим */ }
  },
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const token = tokenStore.get();

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try { data = await res.json(); } catch { /* пустой ответ */ }

    if (!res.ok) {
      if (res.status === 401 && token && !path.startsWith('/api/login')) onUnauthorized?.();
      throw new ApiError(data?.error || `Ошибка сервера (${res.status})`, res.status);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError('Сервер долго не отвечает. Попробуйте ещё раз.', 0);
    throw new ApiError('Нет соединения с сервером', 0);
  } finally {
    clearTimeout(timer);
  }
}

// Забирает бинарный ответ (картинку) с авторизацией и отдаёт временный адрес для <img>.
export async function fetchBlobUrl(path) {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError('Не удалось загрузить картинку', res.status);
  return URL.createObjectURL(await res.blob());
}

export const clanAvatarUrl = (id, version) => (version > 0 ? `${API_BASE}/api/clans/${id}/avatar?v=${version}` : null);

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

export const avatarUrl = (username, version) =>
  version > 0 ? `${API_BASE}/api/users/${encodeURIComponent(username)}/avatar?v=${version}` : null;
