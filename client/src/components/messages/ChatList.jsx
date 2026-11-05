import React from 'react';
import Avatar from '/common/Avatar';

const ChatList = ({ chats, activeChat, onSelectChat, unreadChats }) => {
  return (
    <div className="w-full md:w-2/5 border-r border-white/5 flex flex-col h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg md:text-xl font-black uppercase italic sss-logo tracking-tight text-white">Чаты</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 chat-scroll">
        {(!chats || chats.length === 0) ? (
          <div className="text-center py-8 text-gray-600 font-bold text-xs uppercase tracking-wider">Чатов пока нет</div>
        ) : (
          chats.map(chat => {
            const isActive = activeChat?.username === chat.username;
            const unreadCount = unreadChats[chat.username] || 0;

            return (
              <div
                key={chat.username}
                onClick={() => onSelectChat(chat)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isActive ? 'bg-white/5 border border-white/10' : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <Avatar username={chat.username} avatarUrl={chat.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-black text-xs uppercase tracking-tight text-white/90 truncate">{chat.username}</span>
                    {chat.created_at && (
                      <span className="text-[8px] text-gray-500 font-bold uppercase">
                        {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 font-medium text-xs truncate leading-tight">
                    {chat.last_message || 'Нет сообщений'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-[#ff2a5f] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-[#ff2a5f]/30">
                    {unreadCount}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;