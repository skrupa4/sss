import { useAuth } from '../../context/AuthContext';
import Icon from '../ui/Icons';
import Logo from '../ui/Logo';

/** Верхняя панель на телефоне: логотип и баланс монет всегда на виду (боковое меню там скрыто). */
export default function MobileTopBar() {
  const { user } = useAuth();
  return (
    <header className="safe-top sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-12 max-w-[1000px] items-center justify-between px-3 md:px-6">
        <a href="#/feed" aria-label="На главную"><Logo /></a>
        <div className="flex items-center gap-2">
          <a href="#/coins" className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-sm font-bold tabular-nums text-gold" title="Баланс монет — нажмите, чтобы пополнить" aria-label={`Баланс: ${user.coins ?? 0} монет`}>
            <Icon name="coin" className="h-4 w-4" />
            {(user.coins ?? 0).toLocaleString('ru-RU')}
          </a>
          <a href="#/settings" className="rounded-full p-2 text-muted hover:bg-ink/[0.06] hover:text-ink" aria-label="Настройки"><Icon name="settings" className="h-5 w-5" /></a>
        </div>
      </div>
    </header>
  );
}
