import React from 'react';
import Avatar from 'common/Avatar';

const ProfileHeader = ({
  profileData,
  isOwnProfile,
  isEditing,
  setIsEditing,
  setProfileData,
  handleSaveProfile,
  handleFollow,
  onOpenMessage
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Май 2026';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card rounded-2xl md:rounded-[36px] overflow-hidden shadow-2xl border border-white/10 mb-4">
      <div className="h-28 md:h-40 bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#080808] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,42,95,0.15),transparent_50%)]" />
      </div>

      <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end -mt-10 md:-mt-12 mb-6 gap-4">
          <Avatar
            username={profileData.username}
            avatarUrl={profileData.avatar_url}
            size="xl"
            className="border-[5px] border-[#080808]"
          />

          <div className="flex gap-2 w-full md:w-auto justify-center items-center">
            {isOwnProfile ? (
              <button
                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                className={`px-5 py-2.5 h-11 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center justify-center gap-2 ${
                  isEditing
                    ? 'bg-[#ff2a5f] border-[#ff2a5f] text-white shadow-lg shadow-[#ff2a5f]/20'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black'
                }`}
              >
                {isEditing ? 'Сохранить' : 'Редактировать'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  className={`px-5 py-2.5 h-11 rounded-xl text-[10px] font-black uppercase transition-all border ${
                    profileData.isSubscribed
                      ? 'bg-white/5 border-white/10 text-white'
                      : 'bg-[#ff2a5f] border-[#ff2a5f] text-white shadow-lg shadow-[#ff2a5f]/20 hover:scale-105'
                  }`}
                >
                  {profileData.isSubscribed ? 'Отписаться' : 'Подписаться'}
                </button>
                <button
                  onClick={onOpenMessage}
                  className="px-5 py-2.5 h-11 rounded-xl text-[10px] font-black uppercase bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-all flex items-center justify-center gap-1.5"
                >
                  ЛС
                </button>
              </>
            )}
            <button className="bg-gradient-to-r from-[#ff2a5f] to-[#7e22ce] text-white px-5 py-2.5 h-11 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[#ff2a5f]/20">
              Premium
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4">
          <div className="space-y-2.5 w-full max-w-lg">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <input
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-black outline-none focus:border-[#ff2a5f]"
                  value={profileData.username || ''}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="Имя пользователя"
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-gray-300 outline-none focus:border-[#ff2a5f]"
                  value={profileData.avatar_url || ''}
                  onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                  placeholder="URL изображения аватарки"
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-gray-400 outline-none focus:border-[#ff2a5f]"
                  value={profileData.clan || ''}
                  onChange={(e) => setProfileData({ ...profileData, clan: e.target.value })}
                  placeholder="Название клана"
                />
                <textarea
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#ff2a5f] resize-none"
                  rows="3"
                  value={profileData.bio || ''}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Расскажите о себе (био)..."
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white">
                    {profileData.username}
                  </h1>
                  {profileData.is_verified && (
                    <div className="w-4 h-4 bg-[#ff2a5f] rounded-full flex items-center justify-center text-[8px] text-white font-bold shadow-[0_0_10px_rgba(255,42,95,0.4)]" title="Верифицирован">✓</div>
                  )}
                </div>
                {profileData.bio ? (
                  <p className="text-xs text-gray-300 leading-relaxed">{profileData.bio}</p>
                ) : (
                  <p className="text-xs text-gray-600 italic">Описание профиля не заполнено</p>
                )}
              </>
            )}

            <div className="flex justify-center sm:justify-start gap-6 mt-3">
              <p className="text-xs md:text-sm">
                <span className="font-black text-white">{profileData.followers || 0}</span>
                <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider ml-1">Подписчики</span>
              </p>
              <p className="text-xs md:text-sm">
                <span className="font-black text-white">{profileData.following || 0}</span>
                <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider ml-1">Подписки</span>
              </p>
            </div>

            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pt-2 flex flex-wrap justify-center sm:justify-start gap-4">
              <span>🗓 Регистрация: {formatDate(profileData.created_at || profileData.memberSince)}</span>
              <span className="text-[#ff2a5f]">🛡 Клан: {profileData.clan || 'Без клана'}</span>
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex gap-2.5 h-fit justify-center">
            <div className="w-9 h-9 bg-yellow-500/20 rounded-xl flex items-center justify-center text-lg hover:scale-110 transition-transform cursor-pointer" title="Достижение 1">🏆</div>
            <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center text-lg hover:scale-110 transition-transform cursor-pointer" title="Достижение 2">🔥</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;