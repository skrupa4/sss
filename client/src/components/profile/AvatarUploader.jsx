import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { fileToAvatarDataUrl } from '../../utils/image';
import Icon from '../ui/Icons';

/**
 * Обёртка над аватаркой с кнопкой смены фото. Работает и для пользователя, и для клана:
 * путь загрузки (uploadPath) и сама картинка (children) передаются снаружи.
 */
export default function AvatarUploader({ editable, uploadPath, hasImage, onChanged, children, align = 'md:items-start', size = 'h-9 w-9' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const image = await fileToAvatarDataUrl(file);
      onChanged(await api.post(uploadPath, { image }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      onChanged(await api.del(uploadPath));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${align}`}>
      <div className="relative">
        {children}
        {editable && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Сменить фото"
            className={`absolute -bottom-1 -right-1 flex ${size} items-center justify-center rounded-full border-4 border-surface bg-accent text-white transition hover:scale-105 disabled:opacity-60`}
          >
            {busy ? <span className="spinner !h-4 !w-4 !border-white/30 !border-t-white" /> : <Icon name="camera" className="h-4 w-4" />}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {editable && hasImage && (
        <button type="button" onClick={remove} disabled={busy} className="text-xs text-muted transition-colors hover:text-accent">Удалить фото</button>
      )}
      {error && <p className="max-w-[170px] text-center text-xs text-accent" role="alert">{error}</p>}
    </div>
  );
}
