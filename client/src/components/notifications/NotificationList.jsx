import React from 'react';
import Avatar from '/common/Avatar';

const NotificationList = ({ notifications, onMarkAllAsRead, onUserClick }) => {
  const getNotificationText = (notif) => {
    switch (notif.type) {
      case 'follow': return `подписался на вас`;
      case 'like': return `лайкнул ваш пост`;
      case 'comment': return `прокомментировал: "${notif.content?.substring(0, 40)}..."`;
      case 'repost': return `сделал репост вашей записи`;
      default: return 'оставил активность в профиле';
    }
  };

  return (
    <div className="glass-card rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border border-white/10 w-full">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
        <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase italic text-white">Уведомления</h1>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={onMarkAllAsRead}
            className="text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-white"
          >
            Прочитать все
          </button>
        )}
      </div>

      <div className="divide-y divide-white/5">
        {(!notifications || notifications.length === 0) ? (
          <div className="p-12 text-center text-gray-600 font-bold text-xs uppercase tracking-widest">Уведомлений пока нет</div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id || Math.random()} className={`p-4 transition-all flex items-center gap-4 ${!notif.is_read ? 'bg-white/[0.04]' : 'opacity-60'}`}>
              <Avatar
                username={notif.user_from}
                avatarUrl={notif.avatar_url}
                size="md"
                onClick={() => onUserClick && onUserClick(notif.user_from)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 font-medium">
                  <span
                    onClick={() => onUserClick && onUserClick(notif.user_from)}
                    className="font-black text-[#ff2a5f] cursor-pointer hover:underline uppercase tracking-tight mr-1"
                  >
                    @{notif.user_from}
                  </span>
                  {getNotificationText(notif)}
                </p>
                <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">
                  {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Только что'}
                </p>
              </div>
              {!notif.is_read && <div className="w-2.5 h-2.5 bg-[#ff2a5f] rounded-full shadow-[0_0_8px_#ff2a5f] flex-shrink-0"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationList;