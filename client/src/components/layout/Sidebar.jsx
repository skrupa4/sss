import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useRoute, profilePath } from '../../utils/router';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icons';
import Logo from '../ui/Logo';
import Modal from '../ui/Modal';
import Nick from '../ui/Nick';

function NavItem({ href, icon, label, active, badge, mobileHidden, onClick }) {
  return (
    <a
      href={`#${href}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex-1 items-center justify-center gap-3 rounded-xl p-3 transition-colors lg:flex-none lg:justify-start lg:px-4 ${mobileHidden ? 'hidden lg:flex' : 'flex'} ${
        active ? 'bg-ink/[0.06] text-ink' : 'text-muted hover:bg-ink/[0.04] hover:text-ink'
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

function SheetLink({ href, icon, label, onClick }) {
  return (
    <a href={`#${href}`} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-semibold transition-colors hover:bg-ink/[0.06]">
      <Icon name={icon} className="h-5 w-5 text-muted" /> {label}
    </a>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { counters, connected } = useRealtime();
  const { page, param } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const ownProfile = page === 'profile' && (param || user.username) === user.username;

  return (
    <aside className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 p-2 backdrop-blur lg:sticky lg:top-6 lg:h-fit lg:w-60 lg:shrink-0 lg:rounded-3xl lg:border lg:p-4">
      <a href="#/feed" className="hidden items-center justify-between px-3 py-3 lg:flex">
        <Logo />
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-ok' : 'bg-faint'}`} title={connected ? 'Онлайн: всё приходит мгновенно' : 'Подключение…'} />
      </a>

      <nav className="flex gap-1 lg:mt-2 lg:flex-col" aria-label="Основное меню">
        <NavItem href="/feed" icon="feed" label="Лента" active={page === 'feed'} />
        <NavItem href="/following" icon="users" label="Подписки" active={page === 'following'} />
        <NavItem href="/messages" icon="chat" label="Сообщения" active={page === 'messages'} badge={counters.messages} />
        <NavItem href="/notifications" icon="bell" label="Уведомления" active={page === 'notifications'} badge={counters.notifications} />
        <NavItem href="/clans" icon="clans" label="Кланы" active={page === 'clans'} mobileHidden />
        <NavItem href={profilePath(user.username)} icon="user" label="Профиль" active={ownProfile} mobileHidden />
        <NavItem href="/coins" icon="coin" label="Монеты" active={page === 'coins'} mobileHidden />
        <NavItem href="/premium" icon="crown" label="Premium" active={page === 'premium'} mobileHidden />
        <NavItem href="/settings" icon="settings" label="Настройки" active={page === 'settings'} mobileHidden />
        {user.is_admin && <NavItem href="/admin" icon="shield" label="Админ-панель" active={page === 'admin'} mobileHidden />}
        <button type="button" onClick={() => setMenuOpen(true)} className="flex flex-1 items-center justify-center rounded-xl p-3 text-muted hover:bg-ink/[0.04] hover:text-ink lg:hidden" aria-label="Ещё">
          <Icon name="menu" />
        </button>
      </nav>

      <div className="mt-6 hidden items-center gap-3 border-t border-line px-2 pt-4 lg:flex">
        <Avatar username={user.username} version={user.avatar_version} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold"><Nick name={user.username} color={user.nick_color} premium={user.is_premium} /></p>
          <p className="truncate text-xs text-muted">@{user.handle}</p>
          <a href="#/coins" className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold tabular-nums text-gold" title="Баланс монет">
            <Icon name="coin" className="h-3.5 w-3.5" /> {(user.coins ?? 0).toLocaleString('ru-RU')}
          </a>
        </div>
        <button type="button" onClick={logout} className="rounded-lg p-2 text-muted transition-colors hover:bg-ink/[0.06] hover:text-accent" aria-label="Выйти" title="Выйти">
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* На телефоне остальные разделы живут в шторке */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Меню" size="sm">
        <div className="-mx-2 flex flex-col">
          <SheetLink href={profilePath(user.username)} icon="user" label="Мой профиль" onClick={() => setMenuOpen(false)} />
          <SheetLink href="/clans" icon="clans" label="Кланы" onClick={() => setMenuOpen(false)} />
          <SheetLink href="/coins" icon="coin" label={`Монеты · ${user.coins ?? 0}`} onClick={() => setMenuOpen(false)} />
          <SheetLink href="/premium" icon="crown" label="Premium" onClick={() => setMenuOpen(false)} />
          <SheetLink href="/settings" icon="settings" label="Настройки и тема" onClick={() => setMenuOpen(false)} />
          {user.is_admin && <SheetLink href="/admin" icon="shield" label="Админ-панель" onClick={() => setMenuOpen(false)} />}
          <button type="button" onClick={() => { setMenuOpen(false); logout(); }} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-accent transition-colors hover:bg-accent/10">
            <Icon name="logout" className="h-5 w-5" /> Выйти
          </button>
        </div>
      </Modal>
    </aside>
  );
}
