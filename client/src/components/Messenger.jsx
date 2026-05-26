import React from 'react';

const Messenger = ({ chats, activeChat, messages, messageInput, setMessageInput, handleSendMessage, setActiveChat, loadMessages, messagesEndRef }) => {
  return (
    <div className="glass-card rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border-white/10 flex h-[75vh] md:h-[80vh] w-full">
      {/* Список Чатов */}
      <div className={`w-full md:w-2/5 border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-black uppercase italic sss-logo tracking-tight">Чаты</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 chat-scroll">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-600 font-bold text-xs uppercase tracking-wider">Чатов пока нет</div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.username} 
                onClick={() => { setActiveChat(chat); loadMessages(chat.username); }}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${activeChat?.username === chat.username ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
              >
                <div className="relative flex items-center justify-between w-full">
                  <div>
                    <div className="font-bold text-sm text-white">{chat.username}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[140px]">{chat.last_message}</div>
                  </div>
                  {chat.hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff2a5f] shadow-[0_0_8px_#ff2a5f]"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Окно сообщений */}
      <div className={`w-full md:w-3/5 flex flex-col bg-black/20 ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-400 hover:text-white">Назад</button>
              <div className="font-black uppercase text-sm tracking-wider text-white">{activeChat.username}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === activeChat.username ? 'items-start' : 'items-end'}`}>
                  <div className={`p-3 rounded-2xl max-w-[75%] text-sm ${msg.sender === activeChat.username ? 'bg-white/5 text-white' : 'bg-[#ff2a5f] text-white'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-white/5 flex gap-2">
              <input 
                type="text" 
                value={messageInput} 
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Сообщение..." 
                className="comment-input"
              />
              <button onClick={handleSendMessage} className="bg-white text-black px-4 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition-all active:scale-95">ОК</button>
            </div>
          </>
        ) : (
          <div className="text-gray-600 font-black text-xs uppercase tracking-widest m-auto">Выберите чат для общения</div>
        )}
      </div>
    </div>
  );
};

export default Messenger; // <--- И ВОТ ЭТА СТРОЧКА ТУТ ТОЖЕ ОБЯЗАТЕЛЬНА