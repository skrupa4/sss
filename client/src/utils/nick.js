// Пресеты переливающегося ника. Идентификаторы совпадают с server/src/utils/nick.js.
export const NICK_PRESETS = {
  sunset: { label: 'Закат', colors: ['#ff2a5f', '#ffb347', '#a855f7'] },
  ocean: { label: 'Океан', colors: ['#00c6ff', '#4f7cff', '#7ee8fa'] },
  aurora: { label: 'Аврора', colors: ['#00f5a0', '#00d9f5', '#a855f7'] },
  gold: { label: 'Золото', colors: ['#f9d423', '#ff9a3c', '#fff1a8'] },
  neon: { label: 'Неон', colors: ['#ff00c8', '#00e5ff', '#ff00c8'] },
  lava: { label: 'Лава', colors: ['#ff512f', '#dd2476', '#ffb199'] },
  mint: { label: 'Мята', colors: ['#38ef7d', '#11998e', '#c9ffbf'] },
  violet: { label: 'Фиалка', colors: ['#8e54e9', '#4776e6', '#d4b3ff'] },
};

// Стиль «переливания»: градиент замкнут (первый цвет повторяется в конце), поэтому анимация идёт без шва.
export function nickStyle(color) {
  let stops;
  if (color && color.startsWith('#')) {
    stops = [color, `color-mix(in srgb, ${color} 45%, white)`, color];
  } else {
    const preset = NICK_PRESETS[(color || '').replace('preset:', '')] || NICK_PRESETS.sunset;
    stops = [...preset.colors, preset.colors[0]];
  }
  return {
    backgroundImage: `linear-gradient(90deg, ${stops.join(', ')})`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    animation: 'shine 3.5s linear infinite',
  };
}
