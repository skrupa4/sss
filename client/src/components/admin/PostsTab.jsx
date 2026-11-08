import { useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../context/DialogContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounced } from '../../hooks/useDebounced';
import { timeAgo } from '../../utils/format';
import { profilePath } from '../../utils/router';
import Icon from '../ui/Icons';
import { EmptyState, ErrorState, Spinner } from '../ui/Spinner';
import SearchInput from './SearchInput';
import { useAdminAction } from './useAdminAction';

export default function PostsTab() {
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());
  const { data: posts, loading, error, reload } = useAsync(() => api.get(`/api/admin/posts?q=${encodeURIComponent(q)}`), [q]);
  const { run, busyId } = useAdminAction(reload);

  const remove = async (post) => {
    const ok = await confirm({ title: 'Удалить пост?', message: `Пост @${post.username} исчезнет у всех вместе с комментариями.`, confirmLabel: 'Удалить', danger: true });
    if (ok) run(post.id, () => api.del(`/api/admin/posts/${post.id}`), 'Пост удалён');
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Поиск по тексту или автору" />
      {loading && !posts && <Spinner />}
      {error && !posts && <ErrorState error={error} onRetry={reload} />}
      {posts?.length === 0 && <EmptyState>Постов не найдено.</EmptyState>}
      <ul className="flex flex-col gap-2">
        {posts?.map((p) => (
          <li key={p.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                <a href={`#${profilePath(p.username)}`} className="font-semibold text-ink hover:text-accent">{p.username}</a> · {timeAgo(p.created_at)} · ♥ {p.likes} · 💬 {p.comments_count} · 🔁 {p.reposts}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink/90">{p.content}</p>
            </div>
            <button type="button" disabled={busyId === p.id} onClick={() => remove(p)} aria-label="Удалить пост" className="rounded-lg p-2 text-faint transition-colors hover:bg-white/[0.06] hover:text-accent disabled:opacity-50">
              <Icon name="trash" className="h-[18px] w-[18px]" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
