import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToasts } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import Modal from '../ui/Modal';
import { ErrorState, Spinner } from '../ui/Spinner';

function GiftPicker({ toUser, onClose }) {
  const { updateUser } = useAuth();
  const { push } = useToasts();
  const { data, loading, error, reload } = useAsync(() => api.get('/api/gifts'), []);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const gift = data.gifts.find((g) => g.code === selected);
  const notEnough = gift && data.coins < gift.price;

  const send = async () => {
    setBusy(true);
    setSendError('');
    try {
      const res = await api.post('/api/gifts/send', { to: toUser, gift: selected, message, anonymous });
      updateUser((u) => ({ ...u, coins: res.coins }));
      push({ type: 'success', emoji: gift.icon, title: 'Подарок отправлен', body: `${gift.title} для @${toUser}` });
      onClose();
    } catch (err) {
      setSendError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {data.gifts.map((g) => (
          <li key={g.code}>
            <button
              type="button"
              onClick={() => setSelected(g.code)}
              aria-pressed={selected === g.code}
              className={`flex w-full flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition-all ${
                selected === g.code ? 'border-accent bg-accent/10 scale-[1.03]' : 'border-line bg-raised/60 hover:bg-ink/[0.06]'
              }`}
            >
              <span className="text-3xl leading-none">{g.icon}</span>
              <span className="mt-1 text-xs font-medium">{g.title}</span>
              <span className="text-xs tabular-nums text-gold">🪙 {g.price}</span>
            </button>
          </li>
        ))}
      </ul>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">Подпись (необязательно)</span>
        <input className="input" value={message} maxLength={120} onChange={(e) => setMessage(e.target.value)} placeholder="Например: с днём рождения!" />
      </label>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
        Отправить анонимно
      </label>

      {sendError && <p className="text-sm text-accent" role="alert">{sendError}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-muted">Ваш баланс: <b className="tabular-nums text-gold">🪙 {data.coins}</b></p>
        {notEnough ? (
          <a href="#/coins" onClick={onClose} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
            Пополнить монеты
          </a>
        ) : (
          <button type="button" onClick={send} disabled={!gift || busy} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
            {busy ? 'Отправляем…' : gift ? `Подарить за ${gift.price} 🪙` : 'Выберите подарок'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GiftModal({ open, onClose, toUser }) {
  return (
    <Modal open={open} onClose={onClose} title={`Подарок для @${toUser}`} size="md">
      {open && <GiftPicker toUser={toUser} onClose={onClose} />}
    </Modal>
  );
}
