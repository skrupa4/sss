import { useCallback, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/DialogContext';
import { useToasts } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { formatRegDate, plural } from '../utils/format';
import { navigate, profilePath } from '../utils/router';
import ClanForm from '../components/clans/ClanForm';
import AvatarUploader from '../components/profile/AvatarUploader';
import Avatar from '../components/ui/Avatar';
import { VerifiedBadge } from '../components/ui/Badges';
import ClanAvatar from '../components/ui/ClanAvatar';
import Icon from '../components/ui/Icons';
import Modal from '../components/ui/Modal';
import Nick from '../components/ui/Nick';
import { ErrorState, Spinner } from '../components/ui/Spinner';

export default function ClanPage({ id }) {
  const { user, updateUser } = useAuth();
  const confirm = useConfirm();
  const { push } = useToasts();
  const loader = useCallback(() => api.get(`/api/clans/${id}`), [id]);
  const { data: clan, loading, error, reload } = useAsync(loader, [id]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshUser = async () => updateUser(await api.get('/api/me'));

  const act = async (fn, { refresh = false, after } = {}) => {
    setBusy(true);
    try {
      await fn();
      if (refresh) await refreshUser();
      if (after) after(); else await reload();
    } catch (err) {
      push({ type: 'error', title: 'Не получилось', body: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !clan) return <Spinner label="Загружаем клан…" />;
  if (error && !clan) return <ErrorState error={error.status === 404 ? new Error('Клан не найден') : error} onRetry={error.status === 404 ? null : reload} />;

  const isOwner = clan.my_role === 'owner';
  const isMember = Boolean(clan.my_role);
  const inOtherClan = Boolean(user.clan_id) && !isMember;

  const leave = async () => {
    const ok = await confirm({
      title: 'Выйти из клана?',
      message: isOwner && clan.members_count > 1 ? 'Вы владелец: клан перейдёт к самому старому участнику.' : isOwner ? 'Вы единственный участник, поэтому клан будет удалён.' : `Вы покинете клан «${clan.name}».`,
      confirmLabel: 'Выйти',
      danger: true,
    });
    if (ok) act(() => api.post(`/api/clans/${id}/leave`), { refresh: true, after: () => navigate('/clans') });
  };

  const disband = async () => {
    const ok = await confirm({ title: 'Распустить клан?', message: 'Клан и список его участников будут удалены. Это действие нельзя отменить.', confirmLabel: 'Распустить', danger: true });
    if (ok) act(() => api.del(`/api/clans/${id}`), { refresh: true, after: () => navigate('/clans') });
  };

  const kick = async (member) => {
    const ok = await confirm({ title: `Исключить ${member.username}?`, message: 'Участник потеряет доступ к клану и сможет вступить снова.', confirmLabel: 'Исключить', danger: true });
    if (ok) act(() => api.del(`/api/clans/${id}/members/${member.id}`));
  };

  return (
    <div className="flex flex-col gap-3">
      <a href="#/clans" className="flex w-fit items-center gap-1.5 px-1 text-sm text-muted transition-colors hover:text-ink">
        <Icon name="back" className="h-4 w-4" /> Все кланы
      </a>

      <section className="rounded-3xl border border-line bg-surface p-5 md:p-7">
        <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-start md:text-left">
          <AvatarUploader
            editable={isOwner}
            uploadPath={`/api/clans/${id}/avatar`}
            hasImage={clan.avatar_version > 0}
            align="md:items-center"
            onChanged={async () => { await refreshUser(); await reload(); }}
          >
            <ClanAvatar id={clan.id} tag={clan.tag} version={clan.avatar_version} size={96} rounded="rounded-3xl" className="shadow-xl" />
          </AvatarUploader>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{clan.name}</h1>
            <p className="mt-1 text-sm text-muted">
              [{clan.tag}] · {clan.members_count} {plural(clan.members_count, 'участник', 'участника', 'участников')} · основан {formatRegDate(clan.created_at)}
            </p>
            {clan.description && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/85">{clan.description}</p>}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {!isMember && (
              <button
                type="button"
                disabled={busy || inOtherClan}
                title={inOtherClan ? 'Сначала выйдите из своего клана' : undefined}
                onClick={() => act(() => api.post(`/api/clans/${id}/join`), { refresh: true })}
                className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                Вступить
              </button>
            )}
            {isOwner && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl border border-line bg-ink/[0.04] px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink/10">
                <Icon name="edit" className="h-4 w-4" /> Изменить
              </button>
            )}
            {isMember && (
              <button type="button" disabled={busy} onClick={leave} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-accent">Выйти</button>
            )}
          </div>
        </div>
        {inOtherClan && <p className="mt-4 text-center text-sm text-muted md:text-left">Вы уже состоите в клане «{user.clan_name}». Чтобы вступить сюда, сначала выйдите из него.</p>}
      </section>

      <Modal open={editing} onClose={() => setEditing(false)} title="Настройки клана" size="sm">
        <ClanForm
          initial={clan}
          submitLabel="Сохранить"
          onCancel={() => setEditing(false)}
          onSubmit={async (form) => {
            await api.put(`/api/clans/${id}`, form);
            await refreshUser();
            setEditing(false);
            await reload();
          }}
        />
      </Modal>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-muted">Участники</h2>
        <ul className="divide-y divide-line">
          {clan.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <a href={`#${profilePath(m.username)}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar username={m.username} version={m.avatar_version} size={40} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate"><Nick name={m.username} color={m.nick_color} premium={m.is_premium} /></span>
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
                <button type="button" disabled={busy} onClick={() => kick(m)} className="rounded-lg p-2 text-faint transition-colors hover:bg-ink/[0.06] hover:text-accent" aria-label={`Исключить ${m.username}`} title="Исключить">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <button type="button" disabled={busy} onClick={disband} className="w-fit self-center rounded-xl px-4 py-2 text-sm text-muted transition-colors hover:text-accent">
          Распустить клан
        </button>
      )}
    </div>
  );
}
