import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import EmojiPicker from '../ui/EmojiPicker';
import Icon from '../ui/Icons';
import ImageCropper from '../ui/ImageCropper';
import { ASPECTS } from '../../utils/aspects';
import { insertAtCursor } from '../../utils/text';

const MAX = 500;

export default function PostComposer({ onPublished }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState(null); // data-URL выбранного фото (уже кадрированного)
  const [cropFile, setCropFile] = useState(null);
  const ref = useRef(null);
  const fileRef = useRef(null);

  const publish = async () => {
    if ((!text.trim() && !image) || busy) return;
    setBusy(true);
    setError('');
    try {
      const post = await api.post('/api/posts', { content: text, image });
      setText('');
      setImage(null);
      onPublished?.(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // чтобы можно было выбрать тот же файл ещё раз
    if (!file) return;
    setError('');
    setCropFile(file);
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
          className="min-h-[72px] flex-1 resize-none bg-transparent py-1 text-[15px] text-ink outline-none max-md:text-base placeholder:text-faint"
        />
      </div>
      {cropFile && <ImageCropper file={cropFile} aspects={ASPECTS.post} maxSide={1280} maxBytes={1_000_000} title="Кадр для поста" onDone={(url) => { setImage(url); setCropFile(null); }} onCancel={() => setCropFile(null)} />}
      {image && (
        <div className="relative mt-3 inline-block max-w-full">
          <img src={image} alt="Выбранное фото" className="max-h-64 max-w-full rounded-xl border border-line object-contain" />
          <button type="button" onClick={() => setImage(null)} aria-label="Убрать фото" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black">✕</button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-accent" role="alert">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <EmojiPicker onPick={(emoji) => insertAtCursor(ref.current, text, emoji, setText)} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/*" className="hidden" onChange={pickPhoto} />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Добавить фото" title="Добавить фото" className="rounded-lg p-2 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink">
            <Icon name="image" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {text.length > MAX - 80 && <span className="text-xs text-muted">{MAX - text.length}</span>}
          <button
            type="button"
            onClick={publish}
            disabled={(!text.trim() && !image) || busy}
            className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-bg transition hover:opacity-85 disabled:opacity-40"
          >
            {busy ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </section>
  );
}
