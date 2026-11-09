import { useCallback, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { NICK_PRESETS } from '../utils/nick';
import Icon from '../components/ui/Icons';
import Nick from '../components/ui/Nick';
import { ErrorState, Spinner } from '../components/ui/Spinner';

const PERKS = [
  { emoji: '🎬', title: 'Вертикальные сторис', text: 'Публикуйте сторис на 24 часа — они появляются кружком над лентой у ваших подписчиков.' },
  { emoji: '🌈', title: 'Переливающийся ник', text: 'Ваш ник сияет выбранным цветом в постах, комментариях, чатах и профиле.' },
  { emoji: '👑', title: 'Значок Premium', text: 'Корона рядом с именем в профиле — все видят, что вы с нами с самого начала.' },
];

const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function PremiumPage() {
  const { user, updateUser } = useAuth();
  const { push } = useToasts();
  const loader = useCallback(() => api.get('/api/premium'), []);
  const { data: status, loading, error, reload, setData } = useAsync(loader, []);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('#ff2a5f');

  const refreshUser = async () => updateUser(await api.get('/api/me'));

  const activate = async () => {
    setBusy(true);
    try {
      setData(await api.post('/api/premium/activate'));
      await refreshUser();
      push({ type: 'success', emoji: '💎', title: 'Premium активирован', body: 'Теперь доступны сторис и переливающийся ник.' });
    } catch (err) {
      push({ type: 'error', title: 'Не удалось активировать', body: err.message });
    } finally {
      setBusy(false);
    }
  };

  const saveColor = async (color) => {
    try {
      setData(await api.put('/api/premium/nick', { color }));
      await refreshUser();
    } catch (err) {
      push({ type: 'error', title: 'Не удалось сохранить цвет', body: err.message });
    }
  };

  if (loading && !status) return <Spinner />;
  if (error && !status) return <ErrorState error={error} onRetry={reload} />;

  const current = status.nick_color || 'preset:sunset';

  return (
    <div className="flex flex-col gap-3">
      <section className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-accent/10 to-accent-2/20 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col items-start gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-3xl shadow-lg shadow-orange-500/30">💎</span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">SSS Premium</h1>
            <p className="mt-1.5 max-w-lg text-[15px] text-ink/75">Сторис, свой цвет ника и значок рядом с именем.</p>
          </div>

          {status.active ? (
            <p className="rounded-xl bg-ok/10 px-4 py-2.5 text-sm font-medium text-ok">
              {status.is_admin && !status.until ? 'Premium включён навсегда' : `Premium активен до ${formatDate(status.until)}`}
            </p>
          ) : status.trial_enabled && !status.trial_used ? (
            <button type="button" onClick={activate} disabled={busy} className="rounded-xl bg-ink px-6 py-3 text-sm font-bold text-bg transition hover:scale-[1.02] hover:opacity-90 disabled:opacity-60">
              {busy ? 'Активируем…' : `Попробовать бесплатно ${status.trial_days} дней`}
            </button>
          ) : (
            <p className="rounded-xl bg-ink/[0.06] px-4 py-2.5 text-sm text-muted">
              {status.trial_used ? 'Пробный период уже использован.' : 'Пробный период сейчас недоступен.'}
            </p>
          )}
          {!status.active && status.trial_enabled && !status.trial_used && <p className="text-xs text-ink/50">Тестовая подписка — бесплатно, без карты.</p>}
        </div>
      </section>

      <ul className="grid gap-3 md:grid-cols-3">
        {PERKS.map((perk) => (
          <li key={perk.title} className="rounded-2xl border border-line bg-surface p-5">
            <span className="text-2xl">{perk.emoji}</span>
            <h2 className="mt-3 font-semibold">{perk.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{perk.text}</p>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
        <h2 className="text-lg font-bold tracking-tight">Цвет ника</h2>
        <p className="mt-1 text-sm text-muted">{status.active ? 'Выберите готовый стиль или задайте свой цвет.' : 'Доступно с Premium. Вот как это будет выглядеть:'}</p>

        <div className="mt-4 rounded-2xl bg-raised/70 px-5 py-4 text-center text-2xl font-extrabold tracking-tight">
          <Nick name={user.username} color={current} premium />
        </div>

        <div className={`mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 ${status.active ? '' : 'pointer-events-none opacity-50'}`}>
          {Object.entries(NICK_PRESETS).map(([id, preset]) => {
            const selected = current === `preset:${id}`;
            return (
              <button
                key={id}
                type="button"
                onClick={() => saveColor(`preset:${id}`)}
                aria-pressed={selected}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${selected ? 'border-accent bg-accent/10' : 'border-line hover:border-ink/25'}`}
              >
                <Nick name={preset.label} color={`preset:${id}`} premium />
              </button>
            );
          })}
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-3 ${status.active ? '' : 'pointer-events-none opacity-50'}`}>
          <label className="flex items-center gap-3 text-sm text-muted">
            Свой цвет
            <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-raised p-1" />
          </label>
          <button type="button" onClick={() => saveColor(custom)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink/[0.06]">Применить</button>
          {status.nick_color && (
            <button type="button" onClick={() => saveColor(null)} className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent">
              <Icon name="close" className="h-4 w-4" /> Сбросить
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
