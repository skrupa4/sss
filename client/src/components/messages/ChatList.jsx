import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatTime } from '../../utils/format';
import Avatar from '../ui/Avatar';
import { VerifiedBadge } from '../ui/Badges';
import Nick from '../ui/Nick';
import { messagesPath, navigate } from '../../utils/router';

export default function ChatList({ chats, loading, activeUsername }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const shown = chats?.filter((c) => c.username.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск"
          aria-label="Поиск по чатам"
          className="h-10 w-full rounded-full bg-ink/[0.06] px-4 text-base outline-none placeholder:text-faint focus:bg-ink/[0.09] md:text-[15px]"
        />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto">
        {loading && !chats && <p className="p-6 text-center text-sm text-muted">Загрузка…</p>}
        {chats?.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">Чатов пока нет. Откройте чей-нибудь профиль и нажмите «Написать».</p>
        )}
        {chats?.length > 0 && shown.length === 0 && <p className="p-6 text-center text-sm text-muted">Ничего не найдено</p>}
        {shown?.map((chat) => {
          const active = activeUsername === chat.username;
          return (
            <button
              key={chat.username}
              type="button"
              onClick={() => navigate(messagesPath(chat.username))}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? 'bg-accent text-white' : 'hover:bg-ink/[0.05]'}`}
            >
              <Avatar username={chat.username} version={chat.avatar_version} size={52} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold">{active ? chat.username : <Nick name={chat.username} color={chat.nick_color} premium={chat.is_premium} />}</span>
                    {chat.is_verified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                  </span>
                  <span className={`shrink-0 text-xs ${active ? 'text-white/80' : chat.unread > 0 ? 'text-accent' : 'text-faint'}`}>{formatTime(chat.created_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${active ? 'text-white/85' : 'text-muted'}`}>
                    {chat.last_sender === user.username && <span className={active ? 'text-white' : 'text-ink/80'}>Вы: </span>}
                    {chat.last_message}
                  </p>
                  {chat.unread > 0 && (
                    <span className={`flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-white text-accent' : 'bg-accent text-white'}`}>
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
