import React from 'react';

const Sidebar = ({ view, onViewChange, unreadMessages, unreadNotifications, onLogout, currentUser }) => {
  return (
    <aside className="fixed bottom-0 left-0 w-full lg:w-[240px] lg:static flex flex-row lg:flex-col justify-between lg:justify-start gap-5 glass-card p-3 sm:p-4 lg:p-5 rounded-t-[24px] lg:rounded-[28px] h-fit lg:sticky lg:top-8 shadow-2xl z-[999] border-t border-white/10 lg:border-none">
      <div className="hidden lg:flex justify-center py-4 cursor-pointer" onClick={() => onViewChange('feed')}>
        <span className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-white via-[#ff2a5f] to-[#7e22ce] bg-clip-text text-transparent">
          SSS
        </span>
      </div>

      <nav className="flex flex-row lg:flex-col gap-1 w-full lg:w-auto justify-around lg:justify-start">
        <button
          onClick={() => onViewChange('feed')}
          className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all flex-1 lg:flex-none ${
            view === 'feed' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white'
          }`}
        >
          <svg className={`w-5 h-5 ${view === 'feed' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012-2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg>
          <span className="text-[14px] font-bold hidden sm:inline">Лента</span>
        </button>

        <button
          onClick={() => onViewChange('messages')}
          className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all flex-1 lg:flex-none ${
            view === 'messages' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white'
          }`}
        >
          <svg className={`w-5 h-5 ${view === 'messages' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span className="text-[14px] font-bold hidden sm:inline">Сообщения</span>
          {unreadMessages > 0 && <span className="ml-auto bg-[#ff2a5f] text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}
        </button>

        <button
          onClick={() => onViewChange('notifications')}
          className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all flex-1 lg:flex-none ${
            view === 'notifications' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white'
          }`}
        >
          <svg className={`w-5 h-5 ${view === 'notifications' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          <span className="text-[14px] font-bold hidden sm:inline">Уведомления</span>
          {unreadNotifications > 0 && <span className="ml-auto bg-[#ff2a5f] text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadNotifications}</span>}
        </button>

        <button
          onClick={() => onViewChange('profile', currentUser.username)}
          className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all flex-1 lg:flex-none ${
            view === 'profile' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white'
          }`}
        >
          <svg className={`w-5 h-5 ${view === 'profile' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[14px] font-bold hidden sm:inline">Профиль</span>
        </button>
      </nav>

      <div onClick={onLogout} className="hidden lg:flex mt-16 border-t border-white/5 pt-5 text-gray-600 hover:text-red-500 cursor-pointer transition-all items-center gap-3 px-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        <span className="text-[11px] font-black uppercase tracking-widest">Выход</span>
      </div>
    </aside>
  );
};

export default Sidebar;