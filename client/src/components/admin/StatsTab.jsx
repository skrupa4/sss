import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState, Spinner } from '../ui/Spinner';

const CARDS = [
  ['users', 'Пользователей'],
  ['new_users_week', 'Новых за 7 дней'],
  ['premium_users', 'С Premium'],
  ['banned_users', 'Заблокировано'],
  ['posts', 'Постов'],
  ['posts_today', 'Постов за сутки'],
  ['comments', 'Комментариев'],
  ['messages', 'Сообщений'],
  ['clans', 'Кланов'],
  ['active_stories', 'Активных сторис'],
  ['pending_verifications', 'Заявок на галочку'],
  ['revenue_rub', 'Выручка, ₽'],
  ['coins_sold', 'Продано монет'],
];

export default function StatsTab() {
  const { data, loading, error, reload } = useAsync(() => api.get('/api/admin/stats'), []);
  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {CARDS.map(([key, label]) => (
        <div key={key} className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">{data[key]}</p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}
