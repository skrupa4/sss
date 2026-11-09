import { useState } from 'react';
import AchievementBadge, { TIERS } from './AchievementBadge';
import Modal from '../ui/Modal';

function AchievementRow({ item }) {
  const tier = TIERS[item.tier] || TIERS.common;
  const percent = Math.round((item.progress / item.target) * 100);
  return (
    <li className={`flex items-center gap-3 rounded-2xl border p-3 ${item.unlocked ? 'border-line bg-raised/60' : 'border-line/60 bg-transparent'}`}>
      <AchievementBadge item={item} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <p className={`text-sm font-semibold ${item.unlocked ? 'text-ink' : 'text-muted'}`}>{item.title}</p>
          <span className={`text-[11px] font-medium ${tier.text}`}>{tier.label}</span>
          {item.reward > 0 && <span className="text-[11px] font-medium text-gold">+{item.reward} 🪙</span>}
        </div>
        <p className="text-[13px] text-muted">{item.description}</p>
        {item.unlocked ? (
          item.unlocked_at && <p className="mt-0.5 text-xs text-faint">Получено {new Date(item.unlocked_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        ) : (
          item.target > 1 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-700" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted">{item.progress}/{item.target}</span>
            </div>
          )
        )}
      </div>
    </li>
  );
}

/** Блок «Достижения» в профиле: витрина полученных + окно со всеми и прогрессом. */
export default function AchievementsCard({ data, isOwn }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const unlocked = data.items.filter((i) => i.unlocked);
  const sorted = [...data.items].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const showcase = unlocked.slice(0, 8);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Достижения</h2>
          <p className="text-sm text-muted">Получено {data.unlocked} из {data.total}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-ink/[0.06]">
          Все достижения
        </button>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-700" style={{ width: `${(data.unlocked / data.total) * 100}%` }} />
      </div>

      {showcase.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {showcase.map((item) => (
            <li key={item.code} title={`${item.title}: ${item.description}`}>
              <button type="button" onClick={() => setOpen(true)} className="rounded-2xl transition-transform hover:-translate-y-0.5 hover:rotate-[-4deg]" aria-label={item.title}>
                <AchievementBadge item={item} size={56} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {isOwn ? 'Пока пусто. Опубликуйте пост или подпишитесь на кого-нибудь — первое достижение рядом.' : 'Пока нет полученных достижений.'}
        </p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Достижения · ${data.unlocked}/${data.total}`} size="lg">
        <ul className="grid gap-2 md:grid-cols-2">
          {sorted.map((item) => <AchievementRow key={item.code} item={item} />)}
        </ul>
      </Modal>
    </section>
  );
}
