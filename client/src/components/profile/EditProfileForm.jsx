import { useState } from 'react';
import { api } from '../../api/client';
import VerificationRequest from './VerificationRequest';

const BIO_MAX = 200;

export default function EditProfileForm({ profile, onSaved, onCancel }) {
  const [form, setForm] = useState({ username: profile.username, handle: profile.handle, bio: profile.bio || '', hide_clan_tag: Boolean(profile.hide_clan_tag) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSaved(await api.put('/api/users/me', form));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-line bg-raised/50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Никнейм</span>
          <input className="input" value={form.username} onChange={set('username')} maxLength={24} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Хэндл</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">@</span>
            <input className="input !pl-8" value={form.handle} onChange={set('handle')} maxLength={24} required />
          </div>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 flex justify-between text-muted">
          <span>О себе</span>
          <span className={form.bio.length > BIO_MAX ? 'text-accent' : ''}>{form.bio.length}/{BIO_MAX}</span>
        </span>
        <textarea className="input resize-none" rows={3} value={form.bio} onChange={set('bio')} maxLength={BIO_MAX} placeholder="Расскажите о себе" />
      </label>
      {profile.clan_id && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface/60 p-3 text-sm">
          <input type="checkbox" checked={form.hide_clan_tag} onChange={(e) => setForm((f) => ({ ...f, hide_clan_tag: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          <span>
            <span className="block font-medium">Скрыть тег клана</span>
            <span className="text-muted">Тег не будет показываться рядом с вашим ником в постах и профиле. Вы по-прежнему состоите в клане.</span>
          </span>
        </label>
      )}
      <VerificationRequest />
      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
          Отмена
        </button>
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
