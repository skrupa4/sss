import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import EmojiPicker from '../ui/EmojiPicker';
import { insertAtCursor } from '../../utils/text';

const MAX = 500;

export default function PostComposer({ onPublished }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  const publish = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const post = await api.post('/api/posts', { content: text });
      setText('');
      onPublished?.(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-3">
        <Avatar username={user.username} version={user.avatar_version} size={40} />
        <textarea
          ref={ref}
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) publish(); }}
          placeholder="Что нового?"
          rows={3}
          className="min-h-[72px] flex-1 resize-none bg-transparent py-1 text-[15px] text-ink outline-none placeholder:text-faint"
        />
      </div>
      {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <EmojiPicker onPick={(emoji) => insertAtCursor(ref.current, text, emoji, setText)} />
        <div className="flex items-center gap-3">
          {text.length > MAX - 80 && <span className="text-xs text-muted">{MAX - text.length}</span>}
          <button
            type="button"
            onClick={publish}
            disabled={!text.trim() || busy}
            className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-bg transition hover:bg-white disabled:opacity-40"
          >
            {busy ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </section>
  );
}
