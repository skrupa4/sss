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

const dayKey = (iso) => new Date(iso).toDateString();
function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
}

// Одна галочка — отправлено, две — прочитано.
function Ticks({ read }) {
  return (
    <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-label={read ? 'Прочитано' : 'Отправлено'}>
      <path d="M1.5 6.5l3.5 3.5L11.5 2" />
      {read && <path d="M7.5 9.5l.5.5L14.5 2" />}
    </svg>
  );
}

export default function ChatWindow({ peer, onRead }) {
  const { user } = useAuth();
  const { openChatRef } = useRealtime();
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);
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

  // Собеседник прочитал переписку — наши сообщения получают двойную галочку.
  useSocketEvent('messages:read', (e) => {
    if (e.by === peer) setData((list) => list && list.map((m) => (m.sender === user.username ? { ...m, is_read: true } : m)));
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
    requestAnimationFrame(() => inputRef.current && (inputRef.current.style.height = 'auto'));
    try {
      const msg = await api.post('/api/messages', { receiver: peer, content });
      setData((list) => (list && !list.some((m) => m.id === msg.id) ? [...list, msg] : list));
    } catch (err) {
      setText(content);
      setSendError(err.message);
    }
  };

  // Группируем: соседние сообщения одного автора идут плотно, между группами — отступ, между днями — плашка с датой.
  const items = [];
  (messages || []).forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || dayKey(prev.created_at) !== dayKey(m.created_at)) items.push({ type: 'day', key: `d${m.id}`, label: dayLabel(m.created_at) });
    items.push({
      type: 'msg',
      key: m.id,
      m,
      first: !prev || prev.sender !== m.sender || dayKey(prev.created_at) !== dayKey(m.created_at),
      last: !next || next.sender !== m.sender || dayKey(next.created_at) !== dayKey(m.created_at),
    });
  });

  const resize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2">
        <button type="button" onClick={() => navigate('/messages')} className="rounded-full p-2 text-muted hover:bg-ink/[0.06] hover:text-ink md:hidden" aria-label="Назад к чатам">
          <Icon name="back" className="h-5 w-5" />
        </button>
        <a href={`#${profilePath(peer)}`} className="flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-1 hover:bg-ink/[0.04]">
          <Avatar username={peer} version={peerInfo?.avatar_version} size={38} />
          <span className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
            <Nick name={peer} color={peerInfo?.nick_color} premium={peerInfo?.is_premium} />
            {peerInfo?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </span>
        </a>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-3 py-3 md:px-5">
        {loading && !messages && <Spinner />}
        {error && !messages && <p className="text-center text-sm text-muted">{error.message}</p>}
        {messages?.length === 0 && <p className="py-10 text-center text-sm text-muted">Напишите первое сообщение.</p>}
        {items.map((it) => {
          if (it.type === 'day') {
            return <div key={it.key} className="sticky top-1 z-10 my-3 flex justify-center"><span className="rounded-full bg-ink/[0.12] px-3 py-1 text-xs font-medium text-ink/80 backdrop-blur">{it.label}</span></div>;
          }
          const { m, first, last } = it;
          const mine = m.sender === user.username;
          const radius = mine ? `rounded-2xl ${last ? 'rounded-br-md' : ''}` : `rounded-2xl ${last ? 'rounded-bl-md' : ''}`;
          return (
            <div key={it.key} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${first ? 'mt-2' : 'mt-0.5'}`}>
              <div className={`max-w-[82%] px-3 py-1.5 md:max-w-[70%] ${radius} ${mine ? 'bg-accent text-white' : 'bg-surface text-ink shadow-sm ring-1 ring-line'}`}>
                <span className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.content}</span>
                <span className={`float-right ml-3 mt-1.5 flex items-center gap-1 text-[11px] leading-none ${mine ? 'text-white/75' : 'text-faint'}`}>
                  {formatTime(m.created_at)}
                  {mine && <Ticks read={m.is_read} />}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendError && <p className="bg-surface px-4 pt-1 text-sm text-accent" role="alert">{sendError}</p>}
      <div className="safe-bottom shrink-0 border-t border-line bg-surface">
        <div className="flex items-end gap-2 p-2">
          <textarea
            ref={(el) => { inputRef.current = el; resize(el); }}
            value={text}
            rows={1}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(hover: hover)').matches) { e.preventDefault(); send(); } }}
            placeholder="Сообщение"
            aria-label="Сообщение"
            className="max-h-36 min-h-[44px] w-full resize-none rounded-3xl bg-ink/[0.06] px-4 py-2.5 text-base leading-snug outline-none placeholder:text-faint focus:bg-ink/[0.09] md:text-[15px]"
          />
          <button type="button" onClick={send} disabled={!text.trim()} aria-label="Отправить" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:brightness-110 disabled:bg-ink/10 disabled:text-faint">
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
