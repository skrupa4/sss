import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/DialogContext';
import { useToasts } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { timeAgo } from '../../utils/format';
import { profilePath } from '../../utils/router';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icons';
import Modal from '../ui/Modal';

/** Окно подарка: подпись дарителя и (для владельца) действия «скрыть» и «продать». */
function GiftDetail({ gift, isOwn, onClose, onChanged }) {
  const { updateUser } = useAuth();
  const confirm = useConfirm();
  const { push } = useToasts();
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (err) { push({ type: 'info', emoji: '⚠️', title: 'Не получилось', body: err.message }); } finally { setBusy(false); }
  };

  const toggleHidden = () => run(async () => {
    await api.patch(`/api/gifts/${gift.id}`, { hidden: !gift.is_hidden });
    onChanged();
    onClose();
  });

  const sell = () => run(async () => {
    const ok = await confirm({
      title: `Продать «${gift.title}»?`,
      message: `Вы получите ${gift.sell_price} монет (половина цены). Подарок исчезнет из профиля, вернуть его нельзя.`,
      confirmLabel: `Продать за ${gift.sell_price} 🪙`,
    });
    if (!ok) return;
    const { coins, earned } = await api.post(`/api/gifts/${gift.id}/sell`);
    updateUser((u) => (u ? { ...u, coins } : u));
    push({ type: 'info', emoji: '🪙', title: 'Подарок продан', body: `+${earned} монет на баланс` });
    onChanged();
    onClose();
  });

  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-raised text-6xl">{gift.icon}</div>
      <h3 className="mt-3 text-xl font-extrabold tracking-tight">{gift.title}</h3>
      <p className="mt-1 text-sm text-muted">{timeAgo(gift.created_at)}</p>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        {gift.from_username ? (
          <a href={`#${profilePath(gift.from_username)}`} onClick={onClose} className="flex items-center gap-2 font-semibold hover:text-accent">
            <Avatar username={gift.from_username} version={gift.from_avatar_version} size={28} /> от {gift.from_username}
          </a>
        ) : (
          <span className="text-muted">🕶️ Анонимный даритель</span>
        )}
      </div>

      <blockquote className="mx-auto mt-4 max-w-sm rounded-2xl bg-raised px-4 py-3 text-[15px] leading-relaxed">
        {gift.message ? <>«{gift.message}»</> : <span className="text-muted">Без подписи</span>}
      </blockquote>

      {isOwn && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={toggleHidden} disabled={busy} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-ink/[0.06] disabled:opacity-50">
            {gift.is_hidden ? '👁 Показать в профиле' : '🙈 Скрыть из профиля'}
          </button>
          <button type="button" onClick={sell} disabled={busy} className="rounded-xl bg-gold/15 px-4 py-2.5 text-sm font-bold text-gold hover:bg-gold/25 disabled:opacity-50">
            Продать за {gift.sell_price} 🪙
          </button>
        </div>
      )}
      {isOwn && gift.is_hidden && <p className="mt-3 text-xs text-muted">Сейчас подарок скрыт: его видите только вы.</p>}
    </div>
  );
}

/** Блок «Подарки» в профиле: нажмите на подарок, чтобы увидеть подпись. */
export default function GiftsCard({ username, isOwn }) {
  const loader = useCallback(() => api.get(`/api/gifts/user/${encodeURIComponent(username)}`), [username]);
  const { data, reload } = useAsync(loader, [username]);
  const [openId, setOpenId] = useState(null);
  useSocketEvent('gift:received', () => { if (isOwn) reload(); });

  if (!data) return null;
  if (data.total === 0 && !isOwn) return null;
  const selected = data.items.find((g) => g.id === openId) || null;

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
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setOpenId(g.id)}
                aria-label={`${g.title}: открыть подпись`}
                className={`relative flex w-full flex-col items-center rounded-2xl bg-raised/60 px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:bg-raised active:scale-95 ${g.is_hidden ? 'opacity-50' : ''}`}
              >
                <span className="text-3xl leading-none">{g.icon}</span>
                <span className="mt-1.5 line-clamp-1 text-xs font-medium">{g.title}</span>
                <span className="line-clamp-1 text-[11px] text-muted">{g.from_username ? `от ${g.from_username}` : 'аноним'}</span>
                {g.message && <span className="absolute right-1.5 top-1.5 text-faint" title="Есть подпись"><Icon name="chat" className="h-3 w-3" /></span>}
                {g.is_hidden && <span className="absolute left-1.5 top-1.5 text-[11px]" title="Скрыт от других">🙈</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(selected)} onClose={() => setOpenId(null)} title="Подарок" size="sm">
        {selected && <GiftDetail gift={selected} isOwn={isOwn} onClose={() => setOpenId(null)} onChanged={reload} />}
      </Modal>
    </section>
  );
}
