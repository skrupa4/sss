import { useState } from 'react';
import { avatarUrl } from '../../api/client';
import { avatarGradient } from '../../utils/format';

/**
 * Аватарка: загруженное фото или градиент с первой буквой ника.
 * Если картинка не загрузилась — тихо показываем запасной вариант.
 */
export default function Avatar({ username = '', version = 0, size = 40, rounded = 'rounded-xl', className = '' }) {
  const src = avatarUrl(username, version);
  // Запоминаем, какой именно адрес не загрузился: новая версия аватарки снова пробуется.
  const [brokenSrc, setBrokenSrc] = useState(null);
  const broken = brokenSrc === src;

  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.4) };

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={username}
        loading="lazy"
        onError={() => setBrokenSrc(src)}
        style={style}
        className={`${rounded} shrink-0 bg-raised object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={{ ...style, background: avatarGradient(username) }}
      className={`${rounded} flex shrink-0 select-none items-center justify-center font-bold uppercase text-white ${className}`}
      aria-label={username}
    >
      {username.charAt(0) || '?'}
    </div>
  );
}
