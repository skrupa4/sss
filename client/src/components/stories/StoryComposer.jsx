import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { fileToStoryDataUrl } from '../../utils/image';
import Icon from '../ui/Icons';
import Modal from '../ui/Modal';

export default function StoryComposer({ open, onClose, onPublished }) {
  const inputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setImage(null); setCaption(''); setError(''); setBusy(false); };
  const close = () => { onClose(); setTimeout(reset, 250); };

  const pick = async (file) => {
    if (!file) return;
    setError('');
    try {
      setImage(await fileToStoryDataUrl(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/api/stories', { image, caption });
      onPublished?.();
      close();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Новая сторис" size="sm">
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative aspect-[9/16] w-48 overflow-hidden rounded-2xl border border-dashed border-white/20 bg-raised transition-colors hover:border-accent/60"
          aria-label="Выбрать картинку"
        >
          {image ? (
            <>
              <img src={image} alt="Предпросмотр" className="h-full w-full object-cover" />
              {caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-left text-xs font-medium text-white">{caption}</span>}
            </>
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted transition-colors group-hover:text-ink">
              <Icon name="camera" className="h-8 w-8" />
              Выберите картинку. Она будет обрезана до вертикального формата.
            </span>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

        <label className="block w-full text-sm">
          <span className="mb-1.5 flex justify-between text-muted"><span>Подпись</span><span>{caption.length}/120</span></span>
          <input className="input" value={caption} maxLength={120} onChange={(e) => setCaption(e.target.value)} placeholder="Необязательно" />
        </label>

        {error && <p className="w-full rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">{error}</p>}
        <p className="w-full text-xs text-faint">Сторис видна подписчикам 24 часа.</p>

        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={close} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink">Отмена</button>
          <button type="button" onClick={publish} disabled={!image || busy} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
            {busy ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
