import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { timeAgo } from '../utils/format';
import { ErrorState, Spinner } from '../components/ui/Spinner';

const STATUS_LABEL = { pending: 'Ждёт оплаты', paid: 'Оплачен', canceled: 'Отменён', failed: 'Ошибка' };
const STATUS_STYLE = { paid: 'text-ok', pending: 'text-amber-300', canceled: 'text-muted', failed: 'text-red-400' };

const orderFromHash = () => new URLSearchParams(window.location.hash.split('?')[1] || '').get('order');

// После возврата с оплаты спрашиваем статус заказа (сервер сам сверяется с ЮKassa).
function usePaymentReturn(onPaid) {
  const { push } = useToasts();
  const [checking, setChecking] = useState(() => Boolean(orderFromHash()));

  useEffect(() => {
    const id = orderFromHash();
    if (!id) return undefined;
    let cancelled = false;
    let tries = 0;
    const finish = () => { window.history.replaceState(null, '', `${window.location.pathname}#/coins`); if (!cancelled) setChecking(false); };

    const tick = async () => {
      try {
        const order = await api.get(`/api/coins/orders/${id}`);
        if (cancelled) return;
        if (order.status === 'paid') {
          push({ type: 'success', emoji: '🪙', title: 'Оплата прошла', body: `+${order.coins} монет на балансе` });
          onPaid(order.balance);
          return finish();
        }
        if (order.status !== 'pending') {
          push({ type: 'error', title: 'Платёж не прошёл', body: 'Деньги не списаны. Попробуйте ещё раз.' });
          return finish();
        }
      } catch { /* повторим */ }
      if (++tries >= 15) {
        push({ type: 'info', title: 'Платёж ещё обрабатывается', body: 'Монеты придут сразу после подтверждения оплаты.' });
        return finish();
      }
      setTimeout(tick, 3000);
    };
    tick();
    return () => { cancelled = true; };
  }, [push, onPaid]);

  return checking;
}

export default function CoinsPage() {
  const { user, updateUser } = useAuth();
  const { push } = useToasts();
  const loadPacks = useCallback(() => api.get('/api/coins/packs'), []);
  const { data, loading, error, reload } = useAsync(loadPacks, []);
  const loadOrders = useCallback(() => api.get('/api/coins/orders'), []);
  const { data: orders, reload: reloadOrders } = useAsync(loadOrders, []);
  const [buying, setBuying] = useState(null);

  const onPaid = useCallback((balance) => {
    updateUser((u) => ({ ...u, coins: balance }));
    reload();
    reloadOrders();
  }, [updateUser, reload, reloadOrders]);
  const checking = usePaymentReturn(onPaid);

  const buy = async (pack) => {
    setBuying(pack.code);
    try {
      const res = await api.post('/api/coins/orders', { pack: pack.code, returnUrl: `${window.location.origin}${window.location.pathname}` });
      if (!String(res.confirmation_url).startsWith('https://')) throw new Error('Платёжная страница недоступна');
      window.location.assign(res.confirmation_url);
    } catch (err) {
      push({ type: 'error', title: 'Не получилось', body: err.message });
      setBuying(null);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">Монеты</h1>

      <section className="rounded-3xl border border-line bg-gradient-to-br from-amber-400/15 via-surface to-surface p-6">
        <p className="text-sm text-muted">Ваш баланс</p>
        <p className="mt-1 flex items-center gap-2 text-4xl font-extrabold tabular-nums tracking-tight">
          <span aria-hidden="true">🪙</span> {user.coins ?? data.coins}
        </p>
        <p className="mt-3 text-sm text-muted">
          Монеты можно тратить на подарки друзьям. Их дают за достижения — или можно докупить за рубли.
          {' '}<a href={`#/profile/${encodeURIComponent(user.username)}`} className="text-accent hover:underline">Мои достижения</a>
        </p>
        {checking && <p className="mt-3 text-sm text-amber-300">Проверяем оплату…</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">Пополнить баланс</h2>
        {!data.enabled && (
          <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-300">Оплата пока не подключена — скоро заработает.</p>
        )}
        <ul className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {data.packs.map((p) => (
            <li key={p.code}>
              <button
                type="button"
                disabled={!data.enabled || buying !== null}
                onClick={() => buy(p)}
                className="flex w-full flex-col items-center gap-1 rounded-2xl border border-line bg-raised/60 px-3 py-4 transition-all hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-white/[0.06] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span className="text-2xl font-extrabold tabular-nums">🪙 {p.coins}</span>
                <span className="text-sm font-semibold text-amber-300">{buying === p.code ? 'Переходим к оплате…' : `${p.price_rub} ₽`}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-faint">Оплата проходит на защищённой странице платёжного сервиса. Монеты зачисляются сразу после подтверждения платежа.</p>
      </section>

      {orders?.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold tracking-tight">История пополнений</h2>
          <ul className="mt-3 divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>🪙 {o.coins} <span className="text-muted">· {Number(o.amount_rub)} ₽</span></span>
                <span className="text-right">
                  <span className={STATUS_STYLE[o.status]}>{STATUS_LABEL[o.status] || o.status}</span>
                  <span className="block text-xs text-faint">{timeAgo(o.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
