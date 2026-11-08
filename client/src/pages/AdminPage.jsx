import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ClansTab from '../components/admin/ClansTab';
import PostsTab from '../components/admin/PostsTab';
import SettingsTab from '../components/admin/SettingsTab';
import StatsTab from '../components/admin/StatsTab';
import UsersTab from '../components/admin/UsersTab';
import { EmptyState } from '../components/ui/Spinner';

const TABS = [
  { id: 'stats', label: 'Обзор', Component: StatsTab },
  { id: 'users', label: 'Пользователи', Component: UsersTab },
  { id: 'posts', label: 'Посты', Component: PostsTab },
  { id: 'clans', label: 'Кланы', Component: ClansTab },
  { id: 'settings', label: 'Настройки', Component: SettingsTab },
];

/** Админ-панель. Кнопка в меню видна только админу, а сервер дополнительно проверяет права на каждый запрос. */
export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');

  if (!user.is_admin) return <EmptyState>Эта страница доступна только администратору.</EmptyState>;

  const Active = TABS.find((t) => t.id === tab).Component;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">Админ-панель</h1>
      <div className="scroll-thin flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Active key={tab} />
    </div>
  );
}
