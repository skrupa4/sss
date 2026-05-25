import React from 'react';

const ProfileCard = ({ user }) => {
  return (
    // Главный контейнер карточки
    <div className="w-full max-w-[700px] mx-auto bg-[#161616] rounded-[32px] p-6 pb-5 shadow-2xl font-sans text-white">
      
      {/* ВЕРХНЯЯ ЧАСТЬ: Аватарка и Кнопки */}
      <div className="flex justify-between items-start">
        {/* Аватарка */}
        <div className="relative">
          <div className="w-[100px] h-[100px] rounded-full bg-yellow-500 flex items-center justify-center text-6xl shadow-inner overflow-hidden">
            🤩
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#00e676] rounded-full border-4 border-[#161616]"></div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-4">
          <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
            Редактировать
          </button>
          <button className="bg-[#1d9bf0] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#1a8cd8] transition-colors">
            SSS PREMIUM
          </button>
        </div>
      </div>

      {/* СРЕДНЯЯ ЧАСТЬ: Информация и Достижения */}
      <div className="flex justify-between items-end mt-3">
        
        {/* Левая колонка: Имя, стата, инфо */}
        <div className="flex flex-col gap-3">
          
          {/* Имя и тег */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-bold text-[#ff2a5f] uppercase tracking-tight">
                {user.username}
              </h1>
              {/* Синяя галочка */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#1d9bf0] fill-current">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.728 2.73 1.833 3.444-.06.31-.09.63-.09.956 0 2.21 1.71 4 3.918 4 .58 0 1.12-.14 1.6-.376C9.444 22.185 10.654 23 12 23s2.556-.815 3.194-2.124c.48.235 1.02.375 1.6.375 2.21 0 3.918-1.79 3.918-4 0-.326-.03-.646-.09-.956 1.105-.714 1.833-1.984 1.833-3.444zm-11.455 3.998L6.5 12.502l2.115-2.116 2.43 2.43 6.34-6.34 2.116 2.115-8.456 8.457z"></path>
              </svg>
              <span className="text-gray-400 text-lg">@{user.handle}</span>
            </div>
          </div>

          {/* Подписки / Подписчики */}
          <div className="flex gap-5 text-[15px]">
            <div><span className="font-bold text-white">{user.following}</span> <span className="text-gray-400">Подписки</span></div>
            <div><span className="font-bold text-white">{user.followers}</span> <span className="text-gray-400">Подписчики</span></div>
          </div>

          {/* Регистрация и Клан */}
          <div className="flex flex-col gap-1.5 mt-1 text-[13px] text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Регистрация: {user.regDate}
            </div>
            <div className="flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              Клан: SSS OWNER
            </div>
          </div>

        </div>

        {/* Правая колонка: Плашка достижений */}
        <div className="bg-[#222222] rounded-full px-5 py-2.5 flex items-center gap-3 border border-gray-800/50 mb-2">
          <span className="text-gray-400 text-sm font-medium">Достижения: {user.achievements}</span>
          <div className="w-6 h-6 bg-[#1d9bf0] rounded flex items-center justify-center text-white text-sm shadow-sm">
            ★
          </div>
          <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[10px] font-black shadow-sm">
            :)
          </div>
        </div>

      </div>

      {/* НИЖНЯЯ ЧАСТЬ: Вкладки Посты / Репосты */}
      <div className="bg-[#1e1e1e] rounded-[14px] p-1 flex mt-6 border border-gray-800/30">
        <button className="flex-1 bg-[#333333] text-white py-2 rounded-xl text-sm font-semibold shadow-sm transition">
          Посты
        </button>
        <button className="flex-1 text-gray-400 py-2 rounded-xl text-sm font-medium hover:text-white transition">
          Репосты
        </button>
      </div>

    </div>
  );
};

export default ProfileCard;

