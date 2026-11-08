import { useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import PostComposer from '../components/posts/PostComposer';
import PostList from '../components/posts/PostList';
import StoriesBar from '../components/stories/StoriesBar';

const TABS = [
  { id: 'all', label: 'Все', href: '/feed' },
  { id: 'following', label: 'Подписки', href: '/following' },
];

export default function FeedPage({ mode = 'all' }) {
  const { user } = useAuth();
  const listRef = useRef(null);
  const following = mode === 'following';

  // Для вкладки «Подписки» нужно знать, на кого мы подписаны, чтобы ловить их новые посты «вживую».
  const loadFollowing = useCallback(() => (following ? api.get('/api/users/me/following') : Promise.resolve([])), [following]);
  const { data: followingList } = useAsync(loadFollowing, [following]);

  return (
    <div className="flex flex-col gap-3">
      <StoriesBar />

      <div className="flex rounded-2xl border border-line bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#${t.href}`}
            role="tab"
            aria-selected={mode === t.id}
            className={`flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${mode === t.id ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <PostComposer onPublished={(post) => listRef.current?.addPost(post)} />
      <PostList
        key={mode}
        listRef={listRef}
        loader={() => api.get(following ? '/api/posts?filter=following' : '/api/posts')}
        deps={[mode]}
        acceptNew={(post) => !following || post.username === user.username || Boolean(followingList?.includes(post.username))}
        emptyText={following ? 'Здесь появятся посты тех, на кого вы подписаны. Подпишитесь на кого-нибудь в ленте.' : 'Здесь пока пусто. Опубликуйте первый пост.'}
      />
    </div>
  );
}
