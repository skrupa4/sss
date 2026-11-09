// Тема: 'dark' | 'light' | 'system'. Выбор хранится в localStorage; html[data-theme] ставит итоговый вариант.
const KEY = 'sss_theme';
const COLORS = { dark: '#0a0a0e', light: '#f3f3f7' };

export const THEMES = [
  { id: 'dark', label: 'Тёмная', hint: 'Мягко для глаз вечером' },
  { id: 'light', label: 'Светлая', hint: 'Яркая и контрастная' },
  { id: 'system', label: 'Как в системе', hint: 'Следует настройке устройства' },
];

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.some((t) => t.id === v) ? v : 'dark';
  } catch {
    return 'dark';
  }
}

const resolve = (pref) => (pref === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref);

export function applyTheme(pref) {
  const theme = resolve(pref);
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme]);
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* приватный режим */ }
  applyTheme(pref);
}

// Вызывается один раз при старте: применяет тему и следит за системной.
export function initTheme() {
  applyTheme(getThemePref());
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system');
  });
}
