import { useCallback, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { profilePath } from '../../utils/router';
import { timeAgo } from '../../utils/format';
import Avatar from '../ui/Avatar';
import { VerifiedBadge } from '../ui/Badges';
import EmojiPicker from '../ui/EmojiPicker';
import { insertAtCursor } from '../../utils/text';
import { Spinner } from '../ui/Spinner';

export default function CommentSection({ postId }) {
  const loader = useCallback(() => api.get(`/api/posts/${postId}/comments`), [postId]);
  const { data: comments, loading, error, setData } = useAsync(loader, [postId]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const inputRef = useRef(null);

  const addComment = useCallback((comment) => {
    setData((list) => (list && !list.some((c) => c.id === comment.id) ? [...list, comment] : list));
  }, [setData]);

  // Чужие комментарии появляются сами.
  useSocketEvent('comment:new', (payload) => {
    if (payload.post_id === postId) addComment(payload.comment);
  });

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setSendError('');
    try {
      const comment = await api.post(`/api/posts/${postId}/comments`, { content: text });
      addComment(comment);
      setText('');
    } catch (err) {
      setSendError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      {loading && !comments && <Spinner />}
      {error && <p className="text-sm text-muted">{error.message}</p>}
      {comments?.length === 0 && <p className="text-sm text-muted">Комментариев пока нет. Напишите первым.</p>}

      <div className="scroll-thin flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar username={c.username} version={c.avatar_version} size={28} rounded="rounded-lg" />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-raised px-3 py-2">
              <div className="flex items-center gap-1.5">
                <a href={`#${profilePath(c.username)}`} className="text-[13px] font-semibold hover:text-accent">{c.username}</a>
                {c.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                <span className="text-xs text-faint">{timeAgo(c.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink/85">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {sendError && <p className="text-sm text-accent" role="alert">{sendError}</p>}
      <div className="flex items-center gap-2">
        <EmojiPicker onPick={(emoji) => insertAtCursor(inputRef.current, text, emoji, setText)} />
        <input
          ref={inputRef}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Написать комментарий…"
          className="input h-10 py-0"
        />
        <button type="button" onClick={send} disabled={!text.trim() || busy} className="h-10 rounded-xl bg-ink px-4 text-sm font-semibold text-bg hover:bg-white disabled:opacity-40">
          Ок
        </button>
      </div>
    </div>
  );
}
