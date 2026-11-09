import { useState } from 'react';
import { api, API_BASE } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { profilePath } from '../../utils/router';
import { timeAgo } from '../../utils/format';
import Avatar from '../ui/Avatar';
import { ClanTag, VerifiedBadge } from '../ui/Badges';
import Nick from '../ui/Nick';
import { useConfirm } from '../../context/DialogContext';
import Icon from '../ui/Icons';
import Modal from '../ui/Modal';
import CommentSection from './CommentSection';

function ActionButton({ icon, count, active, activeClass = 'text-accent', onClick, label, fill }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-ink/[0.05] ${active ? activeClass : 'text-muted hover:text-ink'}`}
    >
      <Icon name={icon} className="h-[18px] w-[18px]" fill={fill && active ? 'currentColor' : 'none'} />
      <span>{count || 0}</span>
    </button>
  );
}

/**
 * Карточка поста. Счётчики обновляются сами по событию сокета `post:updated`.
 * removeMode: 'delete' — удалить свой пост, 'unrepost' — убрать репост из своего профиля.
 */
function PostImage({ postId }) {
  const [open, setOpen] = useState(false);
  const src = `${API_BASE}/api/posts/${postId}/image`;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Открыть фото" className="mt-3 block w-full overflow-hidden rounded-xl border border-line bg-raised">
        <img src={src} alt="Фото к посту" loading="lazy" className="max-h-[28rem] w-full object-cover" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Фото" size="lg">
        <img src={src} alt="Фото к посту" className="mx-auto max-h-[75dvh] max-w-full rounded-xl object-contain" />
      </Modal>
    </>
  );
}

export default function PostCard({ initialPost, removeMode, onRemoved }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState('');

  useSocketEvent('post:updated', (counters) => {
    if (counters.id === post.id) setPost((p) => ({ ...p, ...counters }));
  });

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (err) { setError(err.message); }
  };

  const toggleLike = () => run(async () => {
    const res = await api.post(`/api/posts/${post.id}/like`);
    setPost((p) => ({ ...p, ...res }));
  });

  const toggleRepost = () => run(async () => {
    const res = post.reposted_by_me
      ? await api.del(`/api/posts/${post.id}/repost`)
      : await api.post(`/api/posts/${post.id}/repost`);
    setPost((p) => ({ ...p, ...res }));
  });

  const remove = () => run(async () => {
    const unrepost = removeMode === 'unrepost';
    const ok = await confirm({
      title: unrepost ? 'Убрать репост?' : 'Удалить пост?',
      message: unrepost ? 'Пост исчезнет из ваших репостов.' : 'Пост и все комментарии к нему будут удалены без возможности восстановления.',
      confirmLabel: unrepost ? 'Убрать' : 'Удалить',
      danger: true,
    });
    if (!ok) return;
    if (removeMode === 'unrepost') await api.del(`/api/posts/${post.id}/repost`);
    else await api.del(`/api/posts/${post.id}`);
    onRemoved?.(post.id);
  });

  const canRemove = removeMode === 'unrepost' || post.username === user.username;

  return (
    <article className="group rounded-2xl border border-line bg-surface p-4 md:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <a href={`#${profilePath(post.username)}`} aria-label={`Профиль ${post.username}`}>
            <Avatar username={post.username} version={post.avatar_version} size={42} />
          </a>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <a href={`#${profilePath(post.username)}`} className="truncate text-[15px] font-semibold hover:opacity-80"><Nick name={post.username} color={post.nick_color} premium={post.is_premium} /></a>
              {post.is_verified && <VerifiedBadge />}
              <ClanTag tag={post.clan_tag} />
            </div>
            <p className="text-xs text-muted">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={remove}
            aria-label={removeMode === 'unrepost' ? 'Убрать репост' : 'Удалить пост'}
            title={removeMode === 'unrepost' ? 'Убрать репост' : 'Удалить пост'}
            className="rounded-lg p-2 text-faint transition-colors hover:bg-ink/[0.06] hover:text-accent"
          >
            <Icon name="trash" className="h-[18px] w-[18px]" />
          </button>
        )}
      </header>

      {post.content && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/90">{post.content}</p>}
      {post.has_image && <PostImage postId={post.id} />}

      <div className="mt-4 flex items-center gap-1 border-t border-line pt-2">
        <ActionButton icon="heart" label="Нравится" count={post.likes} active={post.liked_by_me} fill onClick={toggleLike} />
        <ActionButton icon="comment" label="Комментарии" count={post.comments_count} active={showComments} activeClass="text-ink" onClick={() => setShowComments((v) => !v)} />
        <ActionButton icon="repost" label="Репост" count={post.reposts} active={post.reposted_by_me} activeClass="text-sky-400" onClick={toggleRepost} />
      </div>

      {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}
      {showComments && <CommentSection postId={post.id} />}
    </article>
  );
}
