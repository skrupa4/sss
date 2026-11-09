import { useCallback } from 'react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { isSystemNotification, notificationText, useRealtime } from '../context/RealtimeContext';
import { timeAgo } from '../utils/format';
import { profilePath } from '../utils/router';
import Avatar from '../components/ui/Avatar';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Spinner';

const SYSTEM_ICON = { achievement: '🏆', announcement: '📢', gift_anon: '🎁', verification_approved: '✅', verification_rejected: '❌' };

export default function NotificationsPage() {
  const { counters } = useRealtime();
  const loader = useCallback(() => api.get('/api/notifications'), []);
  const { data: items, loading, error, reload, setData } = useAsync(loader, []);

  // Новое уведомление появляется в списке мгновенно.
  useSocketEvent('notification:new', (n) => {
    setData((list) => (list && !list.some((x) => x.id === n.id) ? [n, ...list] : list));
  });

  const markAllRead = async () => {
    await api.post('/api/notifications/read', {});
    setData((list) => list.map((n) => ({ ...n, is_read: true })));
  };

  const clearAll = async () => {
    await api.del('/api/notifications');
    setData([]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Уведомления</h1>
        {items?.length > 0 && (
          <div className="flex gap-2">
            {counters.notifications > 0 && (
              <button type="button" onClick={markAllRead} className="rounded-xl bg-ink/[0.06] px-3 py-1.5 text-sm font-semibold hover:bg-ink/10">
                Прочитать все
              </button>
            )}
            <button type="button" onClick={clearAll} className="rounded-xl px-3 py-1.5 text-sm text-muted hover:text-accent">
              Очистить
            </button>
          </div>
        )}
      </div>

      {loading && !items && <Spinner />}
      {error && !items && <ErrorState error={error} onRetry={reload} />}
      {items && items.length === 0 && <EmptyState>Уведомлений пока нет.</EmptyState>}

      {items?.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={n.type === 'gift_anon' ? '#/profile' : n.type === 'verification_request' ? '#/admin' : isSystemNotification(n) ? '#/notifications' : `#${profilePath(n.user_from)}`}
                className={`flex items-start gap-3 p-4 transition-colors hover:bg-ink/[0.03] ${n.is_read ? 'opacity-70' : 'bg-ink/[0.03]'}`}
              >
                {isSystemNotification(n) ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-accent/25 text-xl">
                    {SYSTEM_ICON[n.type] || '📢'}
                  </span>
                ) : (
                  <Avatar username={n.user_from} version={n.from_avatar_version} size={40} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink/90">
                    {isSystemNotification(n) ? (
                      notificationText(n)
                    ) : (
                      <><b className="font-semibold">@{n.user_from}</b> {notificationText(n)}</>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Не прочитано" />}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
