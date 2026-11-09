import { useState } from 'react';
import { api } from '../../api/client';
import { BANNER_PRESETS, bannerStyle } from '../../utils/banner';
import VerificationRequest from './VerificationRequest';

const BIO_MAX = 200;

export default function EditProfileForm({ profile, onSaved, onCancel }) {
  const [form, setForm] = useState({ username: profile.username, handle: profile.handle, bio: profile.bio || '', hide_clan_tag: Boolean(profile.hide_clan_tag), banner_color: profile.banner_color || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Цвет баннера — привилегия Premium: без неё поле вообще не отправляем.
      const { banner_color: banner, ...rest } = form;
      onSaved(await api.put('/api/users/me', profile.is_premium ? { ...rest, banner_color: banner } : rest));
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
      <div className="text-sm">
        <span className="mb-1.5 flex items-center justify-between text-muted">
          <span>Цвет баннера профиля</span>
          {!profile.is_premium && <a href="#/premium" className="font-semibold text-gold hover:underline">🔒 Только для Premium</a>}
        </span>
        <div className={`h-12 rounded-xl border border-line ${form.banner_color ? '' : 'bg-gradient-to-br from-accent/30 via-accent-2/25 to-surface'}`} style={bannerStyle(form.banner_color)} />
        <div className={`mt-2.5 flex flex-wrap items-center gap-2 ${profile.is_premium ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!profile.is_premium}>
          {BANNER_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, banner_color: c }))} aria-label={`Цвет ${c}`} aria-pressed={form.banner_color === c}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${form.banner_color === c ? 'border-ink' : 'border-transparent'}`} style={{ background: c }} tabIndex={profile.is_premium ? 0 : -1} />
          ))}
          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-muted hover:text-ink">
            Свой
            <input type="color" value={form.banner_color || '#ff2a5f'} onChange={(e) => setForm((f) => ({ ...f, banner_color: e.target.value }))} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" tabIndex={profile.is_premium ? 0 : -1} />
          </label>
          {form.banner_color && <button type="button" onClick={() => setForm((f) => ({ ...f, banner_color: '' }))} className="text-xs text-muted hover:text-accent" tabIndex={profile.is_premium ? 0 : -1}>Сбросить</button>}
        </div>
      </div>
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
