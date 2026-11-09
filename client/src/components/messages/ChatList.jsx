import { formatTime } from '../../utils/format';
import Avatar from '../ui/Avatar';
import { VerifiedBadge } from '../ui/Badges';
import Nick from '../ui/Nick';
import { messagesPath, navigate } from '../../utils/router';

export default function ChatList({ chats, loading, activeUsername }) {
  return (
    <div className="scroll-thin flex-1 overflow-y-auto p-2">
      {loading && !chats && <p className="p-6 text-center text-sm text-muted">Загрузка…</p>}
      {chats?.length === 0 && (
        <p className="p-6 text-center text-sm text-muted">
          Чатов пока нет. Откройте чей-нибудь профиль и нажмите «Написать».
        </p>
      )}
      {chats?.map((chat) => (
        <button
          key={chat.username}
          type="button"
          onClick={() => navigate(messagesPath(chat.username))}
          className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${
            activeUsername === chat.username ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.04]'
          }`}
        >
          <Avatar username={chat.username} version={chat.avatar_version} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold"><Nick name={chat.username} color={chat.nick_color} premium={chat.is_premium} /></span>
                {chat.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
              </span>
              <span className="shrink-0 text-xs text-faint">{formatTime(chat.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className={`truncate text-sm ${chat.unread > 0 ? 'font-medium text-ink' : 'text-muted'}`}>{chat.last_message}</p>
              {chat.unread > 0 && (
                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
