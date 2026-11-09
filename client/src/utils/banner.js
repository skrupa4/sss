export const BANNER_PRESETS = ['#ff2a5f', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b'];

/** Стиль баннера профиля по выбранному цвету (или null — тогда остаётся стандартный градиент). */
export const bannerStyle = (color) =>
  /^#[0-9a-f]{6}$/i.test(color || '')
    ? { background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 40%, var(--color-surface)))` }
    : undefined;
