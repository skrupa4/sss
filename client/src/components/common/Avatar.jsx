import React, { useState } from 'react';

export default function Avatar({ src, username, size = 'md', className = '' }) {
  const [hasError, setHasError] = useState(false);

  // Размеры аватара
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl'
  };

  // Получаем первую букву юзернейма для заглушки
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className={`relative rounded-full overflow-hidden flex items-center justify-center bg-white/10 font-bold text-white shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}>
      {src && !hasError ? (
        <img
          src={src}
          alt={username || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="select-none">{initial}</span>
      )}
    </div>
  );
}