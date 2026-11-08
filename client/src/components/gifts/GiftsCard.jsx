import { useCallback } from 'react';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { timeAgo } from '../../utils/format';
import { profilePath } from '../../utils/router';

/** Блок «Подарки» в профиле: полученные подарки с именем дарителя (если не анонимно) и подписью. */
export default function GiftsCard({ username, isOwn }) {
  const loader = useCallback(() => api.get(`/api/gifts/user/${encodeURIComponent(username)}`), [username]);
  const { data, reload } = useAsync(loader, [username]);
  useSocketEvent('gift:received', () => { if (isOwn) reload(); });

  if (!data) return null;
  if (data.total === 0 && !isOwn) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Подарки</h2>
        <span className="text-sm text-muted">{data.total}</span>
      </div>
      {data.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Подарков пока нет. Их можно получить от друзей — или подарить самому на чужом профиле.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {data.items.map((g) => (
            <li
              key={g.id}
              title={`${g.title}${g.message ? ` — «${g.message}»` : ''} · ${timeAgo(g.created_at)}`}
              className="flex flex-col items-center rounded-2xl bg-raised/60 px-2 py-3 text-center"
            >
              <span className="text-3xl leading-none">{g.icon}</span>
              <span className="mt-1.5 line-clamp-1 text-xs font-medium">{g.title}</span>
              {g.from_username ? (
                <a href={`#${profilePath(g.from_username)}`} className="line-clamp-1 text-[11px] text-muted hover:text-accent">от {g.from_username}</a>
              ) : (
                <span className="text-[11px] text-faint">аноним</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
