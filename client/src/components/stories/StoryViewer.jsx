import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, fetchBlobUrl } from '../../api/client';
import { useConfirm } from '../../context/DialogContext';
import { useAsync } from '../../hooks/useAsync';
import { timeAgo } from '../../utils/format';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icons';

const DURATION_MS = 5000;

// Картинка грузится через fetch с токеном (эндпоинт закрыт авторизацией) и освобождается при смене кадра.
function StoryImage({ id }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url = null;
    let cancelled = false;
    fetchBlobUrl(`/api/stories/${id}/image`)
      .then((u) => { if (cancelled) URL.revokeObjectURL(u); else { url = u; setSrc(u); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [id]);

  if (failed) return <div className="flex h-full items-center justify-center text-sm text-white/60">Не удалось загрузить</div>;
  if (!src) return <div className="flex h-full items-center justify-center"><div className="spinner" /></div>;
  return <img src={src} alt="" className="h-full w-full select-none object-cover" draggable={false} />;
}

/**
 * Просмотр сторис на весь экран: полоски прогресса, нажатие слева/справа,
 * пауза при удержании, стрелки и Esc с клавиатуры. После последней сторис — переход к следующему человеку.
 */
export default function StoryViewer({ groups, startIndex, onClose }) {
  const confirm = useConfirm();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const group = groups[groupIndex];

  const loader = useCallback(() => api.get(`/api/stories/user/${encodeURIComponent(group.username)}`), [group.username]);
  const { data: stories, setData } = useAsync(loader, [group.username]);
  const story = stories?.[Math.min(storyIndex, (stories?.length || 1) - 1)];
  const viewedRef = useRef(new Set());

  // Отмечаем просмотр один раз на сторис.
  useEffect(() => {
    if (!story || story.is_mine || viewedRef.current.has(story.id)) return;
    viewedRef.current.add(story.id);
    api.post(`/api/stories/${story.id}/view`).catch(() => {});
  }, [story]);

  const goGroup = useCallback((nextIndex) => {
    if (nextIndex < 0 || nextIndex >= groups.length) return onClose();
    setGroupIndex(nextIndex);
    setStoryIndex(0);
  }, [groups.length, onClose]);

  const next = useCallback(() => {
    if (stories && storyIndex < stories.length - 1) setStoryIndex((i) => i + 1);
    else goGroup(groupIndex + 1);
  }, [stories, storyIndex, groupIndex, goGroup]);

  const prev = useCallback(() => {
    if (storyIndex > 0) setStoryIndex((i) => i - 1);
    else goGroup(groupIndex - 1);
  }, [storyIndex, groupIndex, goGroup]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [next, prev, onClose]);

  const remove = async () => {
    setPaused(true);
    const ok = await confirm({ title: 'Удалить сторис?', message: 'Она исчезнет у всех подписчиков.', confirmLabel: 'Удалить', danger: true });
    if (!ok) return setPaused(false);
    await api.del(`/api/stories/${story.id}`).catch(() => {});
    const left = stories.filter((s) => s.id !== story.id);
    if (!left.length) return onClose();
    setData(left);
    setStoryIndex((i) => Math.min(i, left.length - 1));
    setPaused(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/90 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={`Сторис ${group.username}`}>
      <div className="relative h-[100dvh] w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-black md:h-[92dvh] md:rounded-3xl">
        <div className="absolute inset-0">{story && <StoryImage key={story.id} id={story.id} />}</div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />

        {/* Зоны нажатия: слева назад, справа вперёд; удержание ставит на паузу */}
        <div className="absolute inset-0 flex" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
          <button type="button" className="h-full w-1/3 cursor-w-resize" onClick={prev} aria-label="Назад" />
          <button type="button" className="h-full w-2/3 cursor-e-resize" onClick={next} aria-label="Вперёд" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-3">
          <div className="flex gap-1">
            {(stories || Array.from({ length: group.count })).map((s, i) => (
              <div key={s?.id ?? i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {i < storyIndex && <div className="h-full w-full bg-white" />}
                {i === storyIndex && story && (
                  <div
                    key={story.id}
                    className="h-full origin-left bg-white"
                    style={{ animation: `story-progress ${DURATION_MS}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
                    onAnimationEnd={next}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar username={group.username} version={group.avatar_version} size={36} rounded="rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{group.username}</p>
              {story && <p className="text-xs text-white/70">{timeAgo(story.created_at)}</p>}
            </div>
            {story?.is_mine && story.views != null && (
              <span className="flex items-center gap-1 text-xs text-white/80" title="Просмотры">
                <Icon name="user" className="h-3.5 w-3.5" /> {story.views}
              </span>
            )}
            {story?.is_mine && (
              <button type="button" onClick={remove} className="pointer-events-auto rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white" aria-label="Удалить сторис">
                <Icon name="trash" className="h-[18px] w-[18px]" />
              </button>
            )}
            <button type="button" onClick={onClose} className="pointer-events-auto rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white" aria-label="Закрыть">
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {story?.caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-8 pt-16">
            <p className="text-center text-[17px] font-semibold leading-snug text-white drop-shadow">{story.caption}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
