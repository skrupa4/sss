const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'только что';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

// Дата регистрации берётся из БД (users.created_at), а не зашита в код.
export function formatRegDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

const GRADIENTS = [
  ['#ff2a5f', '#7e22ce'], ['#00c6ff', '#0072ff'], ['#f9d423', '#ff4e50'], ['#11998e', '#38ef7d'],
  ['#f857a6', '#ff5858'], ['#7f7fd5', '#86a8e7'], ['#fc4a1a', '#f7b733'], ['#4776e6', '#8e54e9'],
];

export function avatarGradient(name = '') {
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const [a, b] = GRADIENTS[sum % GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
