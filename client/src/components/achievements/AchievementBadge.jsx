/* eslint-disable react-refresh/only-export-components */
export const TIERS = {
  common: { label: 'Обычное', ring: 'from-slate-400 to-slate-600', glow: '', text: 'text-slate-300' },
  rare: { label: 'Редкое', ring: 'from-sky-400 to-blue-600', glow: 'shadow-[0_0_22px_-6px_rgba(56,189,248,0.7)]', text: 'text-sky-300' },
  epic: { label: 'Эпическое', ring: 'from-fuchsia-500 to-purple-700', glow: 'shadow-[0_0_22px_-6px_rgba(192,38,211,0.75)]', text: 'text-fuchsia-300' },
  legendary: { label: 'Легендарное', ring: 'from-yellow-300 via-amber-400 to-orange-500', glow: 'shadow-[0_0_26px_-4px_rgba(251,191,36,0.8)]', text: 'text-amber-300' },
};

/** Значок достижения: цветная рамка по редкости, у закрытых — серый с прогрессом. */
export default function AchievementBadge({ item, size = 56 }) {
  const tier = TIERS[item.tier] || TIERS.common;
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-2xl p-[2px] ${item.unlocked ? `bg-gradient-to-br ${tier.ring} ${tier.glow}` : 'bg-white/10'}`}
    >
      <div className={`flex h-full w-full items-center justify-center rounded-[14px] bg-surface ${item.unlocked ? '' : 'grayscale opacity-40'}`} style={{ fontSize: size * 0.46 }}>
        {item.icon}
      </div>
    </div>
  );
}
