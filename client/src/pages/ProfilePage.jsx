import { useCallback, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useSocketEvent } from '../hooks/useSocketEvent';
import AchievementsCard from '../components/achievements/AchievementsCard';
import PostComposer from '../components/posts/PostComposer';
import PostList from '../components/posts/PostList';
import ProfileHeader from '../components/profile/ProfileHeader';
import { ErrorState, Spinner } from '../components/ui/Spinner';

const TABS = [
  { id: 'posts', label: 'Записи' },
  { id: 'reposts', label: 'Репосты' },
];

export default function ProfilePage({ username }) {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('posts');
  const listRef = useRef(null);
  const isOwn = username === user.username;

  const loadProfile = useCallback(() => api.get(`/api/users/${encodeURIComponent(username)}`), [username]);
  const { data: profile, loading, error, reload, setData } = useAsync(loadProfile, [username]);

  const loadAchievements = useCallback(() => api.get(`/api/users/${encodeURIComponent(username)}/achievements`), [username]);
  const { data: achievements, reload: reloadAchievements } = useAsync(loadAchievements, [username]);
  // Получили достижение — витрина обновляется сразу.
  useSocketEvent('achievement:unlocked', () => { if (isOwn) reloadAchievements(); });

  if (loading && !profile) return <Spinner label="Загружаем профиль…" />;
  if (error && !profile) {
    return <ErrorState error={error.status === 404 ? new Error('Пользователь не найден') : error} onRetry={error.status === 404 ? null : reload} />;
  }

  const encoded = encodeURIComponent(username);
  return (
    <div className="flex flex-col gap-3">
      <ProfileHeader
        profile={profile}
        isOwn={isOwn}
        achievementsCount={achievements?.unlocked}
        onChange={(next) => {
          setData(next);
          if (isOwn) updateUser((u) => ({ ...u, ...next }));
        }}
      />

      <AchievementsCard data={achievements} isOwn={isOwn} />

      <div className="flex rounded-2xl border border-line bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isOwn && tab === 'posts' && <PostComposer onPublished={(post) => listRef.current?.addPost(post)} />}

      <PostList
        key={tab}
        listRef={listRef}
        loader={() => api.get(tab === 'posts' ? `/api/posts/user/${encoded}` : `/api/posts/reposts/${encoded}`)}
        deps={[username, tab]}
        acceptNew={(post) => tab === 'posts' && post.username === username}
        removeMode={tab === 'reposts' && isOwn ? 'unrepost' : 'delete'}
        emptyText={
          tab === 'posts'
            ? (isOwn ? 'Вы ещё ничего не публиковали.' : 'Пользователь ещё ничего не публиковал.')
            : (isOwn ? 'Вы ещё ничего не репостили.' : 'Пользователь ещё ничего не репостил.')
        }
      />
    </div>
  );
}
