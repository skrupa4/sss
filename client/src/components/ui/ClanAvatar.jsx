import { useState } from 'react';
import { clanAvatarUrl } from '../../api/client';

/** Аватарка клана: загруженная картинка или градиентная плитка с тегом. */
export default function ClanAvatar({ id, tag = '', version = 0, size = 48, rounded = 'rounded-xl', className = '' }) {
  const src = clanAvatarUrl(id, version);
  const [brokenSrc, setBrokenSrc] = useState(null);
  const style = { width: size, height: size };

  if (src && brokenSrc !== src) {
    return <img src={src} alt={tag} loading="lazy" onError={() => setBrokenSrc(src)} style={style} className={`${rounded} shrink-0 bg-raised object-cover ${className}`} />;
  }
  return (
    <div
      style={{ ...style, fontSize: Math.max(10, size * (tag.length > 3 ? 0.24 : 0.3)) }}
      className={`${rounded} flex shrink-0 select-none items-center justify-center bg-gradient-to-br from-accent to-accent-2 font-extrabold uppercase tracking-tight text-white ${className}`}
    >
      {tag}
    </div>
  );
}
