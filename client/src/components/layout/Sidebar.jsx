import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useRoute, profilePath } from '../../utils/router';
import Icon from '../ui/Icons';
import Avatar from '../ui/Avatar';

function NavItem({ href, icon, label, active, badge }) {
  return (
    <a
      href={`#${href}`}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-1 items-center justify-center gap-3 rounded-xl p-3 transition-colors lg:flex-none lg:justify-start lg:px-4 ${
        active ? 'bg-white/[0.06] text-ink' : 'text-muted hover:bg-white/[0.04] hover:text-ink'
      }`}
    >
      <Icon name={icon} className={`h-5 w-5 ${active ? 'text-accent' : ''}`} />
      <span className="hidden text-[15px] font-semibold lg:inline">{label}</span>
      {badge > 0 && (
        <span className="absolute right-2 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white lg:static lg:ml-auto">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </a>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { counters, connected } = useRealtime();
  const { page, param } = useRoute();
  const ownProfile = page === 'profile' && param === user.username;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 p-2 backdrop-blur lg:sticky lg:top-6 lg:h-fit lg:w-60 lg:shrink-0 lg:rounded-3xl lg:border lg:p-4">
      <a href="#/feed" className="hidden items-center justify-between px-3 py-3 lg:flex">
        <span className="brand-text text-4xl font-black italic tracking-tighter">SSS</span>
        <span
          className={`h-2 w-2 rounded-full ${connected ? 'bg-ok' : 'bg-faint'}`}
          title={connected ? 'Онлайн: сообщения приходят мгновенно' : 'Подключение…'}
        />
      </a>

      <nav className="flex gap-1 lg:mt-2 lg:flex-col" aria-label="Основное меню">
        <NavItem href="/feed" icon="feed" label="Лента" active={page === 'feed'} />
        <NavItem href="/messages" icon="chat" label="Сообщения" active={page === 'messages'} badge={counters.messages} />
        <NavItem href="/notifications" icon="bell" label="Уведомления" active={page === 'notifications'} badge={counters.notifications} />
        <NavItem href="/clans" icon="clans" label="Кланы" active={page === 'clans'} />
        <NavItem href={profilePath(user.username)} icon="user" label="Профиль" active={ownProfile} />
        <button type="button" onClick={logout} className="flex flex-1 items-center justify-center rounded-xl p-3 text-muted hover:bg-white/[0.04] hover:text-accent lg:hidden" aria-label="Выйти">
          <Icon name="logout" />
        </button>
      </nav>

      <div className="mt-6 hidden items-center gap-3 border-t border-line px-2 pt-4 lg:flex">
        <Avatar username={user.username} version={user.avatar_version} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.username}</p>
          <p className="truncate text-xs text-muted">@{user.handle}</p>
        </div>
        <button type="button" onClick={logout} className="rounded-lg p-2 text-muted hover:bg-white/[0.06] hover:text-accent" aria-label="Выйти" title="Выйти">
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </aside>
  );
}
