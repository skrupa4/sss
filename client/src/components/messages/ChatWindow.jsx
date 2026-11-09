import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useAsync } from '../../hooks/useAsync';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { formatTime } from '../../utils/format';
import { navigate, profilePath } from '../../utils/router';
import Avatar from '../ui/Avatar';
import { VerifiedBadge } from '../ui/Badges';
import Nick from '../ui/Nick';
import Icon from '../ui/Icons';
import { Spinner } from '../ui/Spinner';

export default function ChatWindow({ peer, onRead }) {
  const { user } = useAuth();
  const { openChatRef } = useRealtime();
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const endRef = useRef(null);
  const firstScroll = useRef(true);

  const loadHistory = useCallback(() => api.get(`/api/messages/history?with=${encodeURIComponent(peer)}`), [peer]);
  const { data: messages, loading, error, setData } = useAsync(loadHistory, [peer]);
  const loadPeer = useCallback(() => api.get(`/api/users/${encodeURIComponent(peer)}`), [peer]);
  const { data: peerInfo } = useAsync(loadPeer, [peer]);

  const markRead = useCallback(async () => {
    try {
      await api.post('/api/messages/read', { chatUser: peer });
      onRead?.();
    } catch { /* не критично */ }
  }, [peer, onRead]);

  // Пока чат открыт, всплывающие уведомления о сообщениях от собеседника не нужны.
  useEffect(() => {
    openChatRef.current = peer;
    return () => { openChatRef.current = null; };
  }, [peer, openChatRef]);

  useEffect(() => { if (messages) markRead(); }, [messages === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сообщения приходят по сокету без перезагрузки страницы.
  useSocketEvent('message:new', (msg) => {
    const belongs = (msg.sender === peer && msg.receiver === user.username) || (msg.sender === user.username && msg.receiver === peer);
    if (!belongs) return;
    setData((list) => (list && !list.some((m) => m.id === msg.id) ? [...list, msg] : list));
    if (msg.sender === peer) markRead();
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth' });
    if (messages) firstScroll.current = false;
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    setSendError('');
    try {
      const msg = await api.post('/api/messages', { receiver: peer, content });
      setData((list) => (list && !list.some((m) => m.id === msg.id) ? [...list, msg] : list));
    } catch (err) {
      setText(content);
      setSendError(err.message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
        <button type="button" onClick={() => navigate('/messages')} className="rounded-lg p-1.5 text-muted hover:bg-ink/[0.06] hover:text-ink md:hidden" aria-label="Назад к чатам">
          <Icon name="back" className="h-5 w-5" />
        </button>
        <a href={`#${profilePath(peer)}`} className="flex min-w-0 items-center gap-3">
          <Avatar username={peer} version={peerInfo?.avatar_version} size={36} />
          <span className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
            <Nick name={peer} color={peerInfo?.nick_color} premium={peerInfo?.is_premium} />
            {peerInfo?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </span>
        </a>
      </header>

      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading && !messages && <Spinner />}
        {error && !messages && <p className="text-center text-sm text-muted">{error.message}</p>}
        {messages?.length === 0 && <p className="py-10 text-center text-sm text-muted">Напишите первое сообщение.</p>}
        {messages?.map((m) => {
          const mine = m.sender === user.username;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'rounded-br-md bg-accent/90 text-white' : 'rounded-bl-md bg-raised text-ink'}`}>
                <p className="whitespace-pre-wrap text-[15px] leading-snug">{m.content}</p>
                <p className={`mt-0.5 text-right text-[11px] ${mine ? 'text-white/70' : 'text-faint'}`}>{formatTime(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError && <p className="px-4 pb-1 text-sm text-accent" role="alert">{sendError}</p>}
      <div className="flex shrink-0 items-center gap-2 border-t border-line p-3">
        <input
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Написать сообщение…"
          className="input h-11 py-0"
        />
        <button type="button" onClick={send} disabled={!text.trim()} aria-label="Отправить" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:brightness-110 disabled:opacity-40">
          <Icon name="send" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
