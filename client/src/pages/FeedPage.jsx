import { useRef } from 'react';
import { api } from '../api/client';
import PostComposer from '../components/posts/PostComposer';
import PostList from '../components/posts/PostList';

export default function FeedPage() {
  const listRef = useRef(null);
  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 text-2xl font-extrabold tracking-tight">Лента</h1>
      <PostComposer onPublished={(post) => listRef.current?.addPost(post)} />
      <PostList
        listRef={listRef}
        loader={() => api.get('/api/posts')}
        deps={[]}
        acceptNew={() => true}
        emptyText="Здесь пока пусто. Опубликуйте первый пост."
      />
    </div>
  );
}
