import React from 'react';

const getAvatarGradient = (username = '') => {
  if (!username) return 'from-gray-700 to-gray-900';
  const charCodeSum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-[#ff2a5f] to-[#7e22ce]',
    'from-[#00f2fe] to-[#4facfe]',
    'from-[#f9d423] to-[#ff4e50]',
    'from-[#b1f4cf] to-[#9890e3]',
    'from-[#f11712] to-[#190e17]',
    'from-[#00c6ff] to-[#0072ff]',
    'from-[#f857a6] to-[#ff5858]',
    'from-[#11998e] to-[#38ef7d]',
  ];
  return gradients[charCodeSum % gradients.length];
};

const Avatar = ({ username, avatarUrl, size = 'md', className = '', onClick }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-12 h-12 text-base rounded-xl',
    xl: 'w-24 h-24 md:w-28 md:h-28 text-3xl md:text-4xl rounded-2xl md:rounded-[28px]',
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        onClick={onClick}
        className={`${sizeClasses[size]} object-cover border border-white/10 ${className} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${sizeClasses[size]} bg-gradient-to-br ${getAvatarGradient(username)} flex items-center justify-center text-white font-black uppercase select-none shadow-md ${className} ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
    >
      {username ? username.charAt(0) : '?'}
    </div>
  );
};

export default Avatar;