import { useCallback, useImperativeHandle } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { EmptyState, ErrorState, Spinner } from '../ui/Spinner';
import PostCard from './PostCard';

/**
 * Список постов с «живыми» обновлениями.
 * loader — функция загрузки, acceptNew — какие новые посты показывать (по сокету),
 * onPublished — снаружи можно добавить только что созданный пост.
 */
export default function PostList({ loader, deps, acceptNew, removeMode, emptyText, listRef }) {
  const { data: posts, loading, error, reload, setData } = useAsync(loader, deps);

  const addPost = useCallback((post) => {
    setData((list) => (list && !list.some((p) => p.id === post.id) ? [post, ...list] : list));
  }, [setData]);

  // Родитель (композер) может сразу добавить свежий пост через listRef.current.addPost.
  useImperativeHandle(listRef, () => ({ addPost }), [addPost]);

  useSocketEvent('post:new', (post) => { if (acceptNew?.(post)) addPost(post); });
  useSocketEvent('post:deleted', ({ id }) => setData((list) => list?.filter((p) => p.id !== id)));

  if (loading && !posts) return <Spinner label="Загружаем посты…" />;
  if (error && !posts) return <ErrorState error={error} onRetry={reload} />;
  if (!posts?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          initialPost={post}
          removeMode={removeMode}
          onRemoved={(id) => setData((list) => list.filter((p) => p.id !== id))}
        />
      ))}
    </div>
  );
}
