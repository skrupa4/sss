import { nickStyle } from '../../utils/nick';

/**
 * Имя пользователя. У Premium-пользователей ник переливается выбранным цветом,
 * у остальных — обычный текст.
 */
export default function Nick({ name, color, premium, className = '' }) {
  if (!premium) return <span className={className}>{name}</span>;
  return (
    <span className={`nick-shine ${className}`} style={nickStyle(color)}>
      {name}
    </span>
  );
}
