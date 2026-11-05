import React, { useState, useEffect, useRef } from 'react';
import Avatar from 'common/Avatar';
import { useSocket } from '../../context/SocketContext';

const ChatWindow = ({ activeChat, currentUser, messages, setMessages, onBack, onUserClick }) => {
  const [text, setText] = useState('');
  const socket = useSocket();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Слушаем мгновенные сообщения из WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      if (
        (newMsg.sender === activeChat.username && newMsg.receiver === currentUser.username) ||
        (newMsg.sender === currentUser.username && newMsg.receiver === activeChat.username)
      ) {
        setMessages(prev => [...prev, newMsg]);
      }
    };

    socket.on('receive_message', handleNewMessage);
    return () => socket.off('receive_message', handleNewMessage);
  }, [socket, activeChat.username, currentUser.username, setMessages]);

  const handleSend = () => {
    if (!text.trim()) return;

    const msgPayload = {
      sender: currentUser.username,
      receiver: activeChat.username,
      content: text,
      created_at: new Date().toISOString()
    };

    if (socket) {
      socket.emit('send_message', msgPayload);
    }

    setMessages(prev => [...prev, msgPayload]);
    setText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-black/20 h-full">
      <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center gap-3 h-[60px]">
        <button onClick={onBack} className="md:hidden p-1.5 text-gray-400 hover:text-white bg-white/5 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <Avatar username={activeChat.username} avatarUrl={activeChat.avatar_url} size="sm" onClick={() => onUserClick(activeChat.username)} />
        <div className="flex-1">
          <h2 className="font-black text-xs uppercase tracking-wider text-white cursor-pointer" onClick={() => onUserClick(activeChat.username)}>
            {activeChat.username}
          </h2>
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Онлайн</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b0b0b]/40">
        {messages.map((msg, i) => {
          const isMe = msg.sender === currentUser.username;
          return (
            <div key={msg.id || i} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl border text-[13px] leading-relaxed shadow-lg ${
                isMe ? 'bg-gradient-to-br from-[#ff2a5f]/20 to-[#7e22ce]/10 border-[#ff2a5f]/30 rounded-br-none text-white' : 'bg-white/5 border-white/5 rounded-bl-none text-gray-200'
              }`}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className="text-[8px] text-gray-500 font-bold uppercase mt-1 text-right">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/5 bg-white/[0.01] flex gap-2 items-center">
        <input
          type="text"
          placeholder="Написать сообщение..."
          className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 h-10 text-xs text-white outline-none focus:border-white/20"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-white text-black h-10 px-5 rounded-xl font-black text-[11px] uppercase hover:bg-gray-200 active:scale-95 transition-all"
        >
          Отправить
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;