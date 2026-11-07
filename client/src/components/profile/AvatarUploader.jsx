import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { fileToAvatarDataUrl } from '../../utils/image';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icons';

export default function AvatarUploader({ profile, editable, onChanged }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const image = await fileToAvatarDataUrl(file);
      onChanged(await api.post('/api/users/me/avatar', { image }));
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
      onChanged(await api.del('/api/users/me/avatar'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 md:items-start">
      <div className="relative">
        <Avatar
          username={profile.username}
          version={profile.avatar_version}
          size={104}
          rounded="rounded-3xl"
          className="border-4 border-surface shadow-xl"
        />
        {editable && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Сменить фото"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-surface bg-accent text-white transition hover:scale-105 disabled:opacity-60"
          >
            {busy ? <span className="spinner !h-4 !w-4 !border-white/30 !border-t-white" /> : <Icon name="camera" className="h-4 w-4" />}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {editable && profile.avatar_version > 0 && (
        <button type="button" onClick={remove} disabled={busy} className="text-xs text-muted hover:text-accent">
          Удалить фото
        </button>
      )}
      {error && <p className="max-w-[160px] text-center text-xs text-accent md:text-left" role="alert">{error}</p>}
    </div>
  );
}
