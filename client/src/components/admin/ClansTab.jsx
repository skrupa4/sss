import { api } from '../../api/client';
import { useConfirm } from '../../context/DialogContext';
import { useAsync } from '../../hooks/useAsync';
import { clanPath } from '../../utils/router';
import ClanAvatar from '../ui/ClanAvatar';
import { EmptyState, ErrorState, Spinner } from '../ui/Spinner';
import { useAdminAction } from './useAdminAction';

export default function ClansTab() {
  const confirm = useConfirm();
  const { data: clans, loading, error, reload } = useAsync(() => api.get('/api/admin/clans'), []);
  const { run, busyId } = useAdminAction(reload);
  const btn = 'rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.06] disabled:opacity-50';

  const disband = async (clan) => {
    const ok = await confirm({ title: 'Распустить клан?', message: `Клан «${clan.name}» будет удалён, участники останутся без клана.`, confirmLabel: 'Распустить', danger: true });
    if (ok) run(clan.id, () => api.del(`/api/admin/clans/${clan.id}`), 'Клан распущен');
  };

  return (
    <div className="flex flex-col gap-2">
      {loading && !clans && <Spinner />}
      {error && !clans && <ErrorState error={error} onRetry={reload} />}
      {clans?.length === 0 && <EmptyState>Кланов пока нет.</EmptyState>}
      {clans?.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <ClanAvatar id={c.id} tag={c.tag} version={c.avatar_version} size={48} />
          <div className="min-w-0 flex-1">
            <a href={`#${clanPath(c.id)}`} className="truncate text-sm font-semibold hover:text-accent">[{c.tag}] {c.name}</a>
            <p className="truncate text-xs text-muted">Владелец: {c.owner_username || '—'} · участников: {c.members_count}</p>
          </div>
          <div className="flex gap-2">
            {c.avatar_version > 0 && (
              <button type="button" disabled={busyId === c.id} className={btn} onClick={() => run(c.id, () => api.del(`/api/admin/clans/${c.id}/avatar`), 'Аватарка удалена')}>
                Убрать аватарку
              </button>
            )}
            <button type="button" disabled={busyId === c.id} className={`${btn} !text-red-400`} onClick={() => disband(c)}>Распустить</button>
          </div>
        </div>
      ))}
    </div>
  );
}
