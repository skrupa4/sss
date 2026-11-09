import { useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../context/DialogContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounced } from '../../hooks/useDebounced';
import { formatRegDate } from '../../utils/format';
import { profilePath } from '../../utils/router';
import Avatar from '../ui/Avatar';
import { VerifiedBadge } from '../ui/Badges';
import { EmptyState, ErrorState, Spinner } from '../ui/Spinner';
import SearchInput from './SearchInput';
import { useAdminAction } from './useAdminAction';

const PREMIUM_DAYS = [7, 30, 90, 365];

function UserRow({ u, busy, onAction }) {
  const [days, setDays] = useState(30);
  const [coins, setCoins] = useState('');
  const btn = 'rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-ink/[0.06] disabled:opacity-50';
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar username={u.username} version={u.avatar_version} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            <a href={`#${profilePath(u.username)}`} className="truncate hover:text-accent">{u.username}</a>
            {u.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
            {u.is_admin && <span className="rounded-md bg-yellow-500/10 px-1.5 py-0.5 text-[11px] text-yellow-400">админ</span>}
            {u.is_banned && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] text-red-400">заблокирован</span>}
            {u.premium_active && <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent">premium</span>}
          </p>
          <p className="truncate text-xs text-muted">@{u.handle} · {u.email} · с {formatRegDate(u.created_at)} · постов: {u.posts} · монет: {u.coins}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} className={btn} onClick={() => onAction(u, 'verify')}>
          {u.is_verified ? 'Снять галочку' : 'Подтвердить'}
        </button>
        {!u.is_admin && (
          <button type="button" disabled={busy} className={btn} onClick={() => onAction(u, 'ban')}>
            {u.is_banned ? 'Разблокировать' : 'Заблокировать'}
          </button>
        )}
        <span className="flex items-center gap-1">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input !w-auto !rounded-lg !py-1.5 !text-xs" aria-label="Срок Premium">
            {PREMIUM_DAYS.map((d) => <option key={d} value={d}>{d} дн.</option>)}
          </select>
          <button type="button" disabled={busy} className={btn} onClick={() => onAction(u, 'grant', days)}>Выдать Premium</button>
        </span>
        <span className="flex items-center gap-1">
          <input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} placeholder="±монеты" className="input !w-24 !rounded-lg !py-1.5 !text-xs" aria-label="Начислить монеты" />
          <button type="button" disabled={busy || !Number.isInteger(Number(coins)) || Number(coins) === 0} className={btn} onClick={() => { onAction(u, 'coins', Number(coins)); setCoins(''); }}>Монеты</button>
        </span>
        {u.premium_until && !u.is_admin && (
          <button type="button" disabled={busy} className={btn} onClick={() => onAction(u, 'revoke')}>Снять Premium</button>
        )}
        {!u.is_admin && (
          <button type="button" disabled={busy} className={`${btn} ml-auto !text-red-400`} onClick={() => onAction(u, 'delete')}>Удалить</button>
        )}
      </div>
    </li>
  );
}

export default function UsersTab() {
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());
  const { data: users, loading, error, reload } = useAsync(() => api.get(`/api/admin/users?q=${encodeURIComponent(q)}`), [q]);
  const { run, busyId } = useAdminAction(reload);

  const onAction = async (u, action, days) => {
    const patch = (body, text) => run(u.id, () => api.patch(`/api/admin/users/${u.id}`, body), text);
    switch (action) {
      case 'verify':
        return patch({ is_verified: !u.is_verified }, u.is_verified ? 'Галочка снята' : 'Аккаунт подтверждён');
      case 'ban': {
        if (!u.is_banned && !(await confirm({ title: 'Заблокировать пользователя?', message: `${u.username} не сможет войти и пользоваться сайтом.`, confirmLabel: 'Заблокировать', danger: true }))) return null;
        return patch({ is_banned: !u.is_banned }, u.is_banned ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
      }
      case 'grant':
        return patch({ premium_days: days }, `Premium выдан на ${days} дн.`);
      case 'coins':
        return patch({ coins_delta: days }, `Баланс изменён на ${days > 0 ? '+' : ''}${days}`);
      case 'revoke':
        return patch({ revoke_premium: true }, 'Premium снят');
      case 'delete': {
        if (!(await confirm({ title: 'Удалить аккаунт?', message: `${u.username}: профиль, посты, комментарии и сообщения будут удалены безвозвратно.`, confirmLabel: 'Удалить', danger: true }))) return null;
        return run(u.id, () => api.del(`/api/admin/users/${u.id}`), 'Аккаунт удалён');
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Поиск по нику, хэндлу или email" />
      {loading && !users && <Spinner />}
      {error && !users && <ErrorState error={error} onRetry={reload} />}
      {users?.length === 0 && <EmptyState>Никого не нашли.</EmptyState>}
      <ul className="flex flex-col gap-2">
        {users?.map((u) => <UserRow key={u.id} u={u} busy={busyId === u.id} onAction={onAction} />)}
      </ul>
    </div>
  );
}
