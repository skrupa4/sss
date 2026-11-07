import { useCallback, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { formatRegDate, plural } from '../utils/format';
import { navigate, profilePath } from '../utils/router';
import ClanForm from '../components/clans/ClanForm';
import Avatar from '../components/ui/Avatar';
import { VerifiedBadge } from '../components/ui/Badges';
import Icon from '../components/ui/Icons';
import { ErrorState, Spinner } from '../components/ui/Spinner';

export default function ClanPage({ id }) {
  const { user, updateUser } = useAuth();
  const loader = useCallback(() => api.get(`/api/clans/${id}`), [id]);
  const { data: clan, loading, error, reload } = useAsync(loader, [id]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const act = async (fn, { refreshUser = false, after } = {}) => {
    setBusy(true);
    setActionError('');
    try {
      await fn();
      if (refreshUser) updateUser(await api.get('/api/me'));
      if (after) after(); else await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !clan) return <Spinner label="Загружаем клан…" />;
  if (error && !clan) return <ErrorState error={error.status === 404 ? new Error('Клан не найден') : error} onRetry={error.status === 404 ? null : reload} />;

  const isOwner = clan.my_role === 'owner';
  const isMember = Boolean(clan.my_role);
  const inOtherClan = Boolean(user.clan_id) && !isMember;

  return (
    <div className="flex flex-col gap-3">
      <a href="#/clans" className="flex w-fit items-center gap-1.5 px-1 text-sm text-muted hover:text-ink">
        <Icon name="back" className="h-4 w-4" /> Все кланы
      </a>

      <section className="rounded-3xl border border-line bg-surface p-5 md:p-7">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-xl font-extrabold text-white shadow-xl">
            {clan.tag}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{clan.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {clan.members_count} {plural(clan.members_count, 'участник', 'участника', 'участников')} · основан {formatRegDate(clan.created_at)}
            </p>
            {clan.description && <p className="mt-3 whitespace-pre-wrap text-[15px] text-ink/85">{clan.description}</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {!isMember && (
              <button
                type="button"
                disabled={busy || inOtherClan}
                title={inOtherClan ? 'Сначала выйдите из своего клана' : undefined}
                onClick={() => act(() => api.post(`/api/clans/${id}/join`), { refreshUser: true })}
                className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                Вступить
              </button>
            )}
            {isOwner && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/10">
                <Icon name="edit" className="h-4 w-4" /> Изменить
              </button>
            )}
            {isMember && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(isOwner && clan.members_count > 1 ? 'Вы владелец: клан перейдёт к самому старому участнику. Выйти?' : 'Выйти из клана?')) return;
                  act(() => api.post(`/api/clans/${id}/leave`), { refreshUser: true, after: () => navigate('/clans') });
                }}
                className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-accent"
              >
                Выйти
              </button>
            )}
          </div>
        </div>
        {inOtherClan && <p className="mt-4 text-center text-sm text-muted md:text-left">Вы уже состоите в клане «{user.clan_name}». Чтобы вступить сюда, сначала выйдите из него.</p>}
        {actionError && <p className="mt-4 text-sm text-accent" role="alert">{actionError}</p>}
      </section>

      {editing && (
        <ClanForm
          initial={clan}
          submitLabel="Сохранить"
          onCancel={() => setEditing(false)}
          onSubmit={async (form) => {
            await api.put(`/api/clans/${id}`, form);
            updateUser(await api.get('/api/me'));
            setEditing(false);
            await reload();
          }}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-muted">Участники</h2>
        <ul className="divide-y divide-line">
          {clan.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <a href={`#${profilePath(m.username)}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar username={m.username} version={m.avatar_version} size={40} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate">{m.username}</span>
                    {m.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  </p>
                  <p className="text-xs text-muted">@{m.handle}</p>
                </div>
              </a>
              {m.role === 'owner' && (
                <span className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-1 text-xs font-semibold text-yellow-400">
                  <Icon name="crown" className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1.5} /> Владелец
                </span>
              )}
              {isOwner && m.role !== 'owner' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => window.confirm(`Исключить ${m.username} из клана?`) && act(() => api.del(`/api/clans/${id}/members/${m.id}`))}
                  className="rounded-lg p-2 text-faint hover:bg-white/[0.06] hover:text-accent"
                  aria-label={`Исключить ${m.username}`}
                  title="Исключить"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <button
          type="button"
          disabled={busy}
          onClick={() => window.confirm('Распустить клан? Это действие нельзя отменить.') && act(() => api.del(`/api/clans/${id}`), { refreshUser: true, after: () => navigate('/clans') })}
          className="w-fit self-center rounded-xl px-4 py-2 text-sm text-muted hover:text-accent"
        >
          Распустить клан
        </button>
      )}
    </div>
  );
}
