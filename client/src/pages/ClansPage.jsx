import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { plural } from '../utils/format';
import { clanPath, navigate } from '../utils/router';
import ClanForm from '../components/clans/ClanForm';
import ClanAvatar from '../components/ui/ClanAvatar';
import Icon from '../components/ui/Icons';
import Modal from '../components/ui/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Spinner';

export default function ClansPage() {
  const { user, updateUser } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loader = useCallback(() => api.get(`/api/clans?q=${encodeURIComponent(debounced)}`), [debounced]);
  const { data: clans, loading, error, reload } = useAsync(loader, [debounced]);

  const create = async (form) => {
    const clan = await api.post('/api/clans', form);
    updateUser(await api.get('/api/me'));
    setCreating(false);
    navigate(clanPath(clan.id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Кланы</h1>
        {!user.clan_id && (
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">
            <Icon name="plus" className="h-4 w-4" /> Создать клан
          </button>
        )}
      </div>

      {user.clan_id && (
        <a href={`#${clanPath(user.clan_id)}`} className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 transition-colors hover:bg-accent/15">
          <ClanAvatar id={user.clan_id} tag={user.clan_tag} version={user.clan_avatar_version} size={44} />
          <span className="text-sm">Ваш клан: <b className="font-semibold">{user.clan_name}</b></span>
        </a>
      )}

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
        <input className="input !pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти клан по названию или тегу" />
      </div>

      {loading && !clans && <Spinner />}
      {error && !clans && <ErrorState error={error} onRetry={reload} />}
      {clans?.length === 0 && <EmptyState>{debounced ? 'Ничего не нашлось.' : 'Кланов пока нет — создайте первый.'}</EmptyState>}

      <ul className="flex flex-col gap-2">
        {clans?.map((clan) => (
          <li key={clan.id}>
            <a href={`#${clanPath(clan.id)}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-white/[0.03]">
              <ClanAvatar id={clan.id} tag={clan.tag} version={clan.avatar_version} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{clan.name}</p>
                <p className="truncate text-sm text-muted">{clan.description || 'Без описания'}</p>
              </div>
              <span className="shrink-0 text-sm text-muted">
                {clan.members_count} {plural(clan.members_count, 'участник', 'участника', 'участников')}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый клан" size="sm">
        <ClanForm submitLabel="Создать клан" onSubmit={create} onCancel={() => setCreating(false)} />
        <p className="mt-3 text-xs text-faint">Аватарку клана можно загрузить на его странице после создания.</p>
      </Modal>
    </div>
  );
}
