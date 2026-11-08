import { useState } from 'react';

export default function ClanForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: initial?.name || '', tag: initial?.tag || '', description: initial?.description || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Название</span>
          <input className="input" value={form.name} onChange={set('name')} minLength={3} maxLength={32} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Тег (2–5)</span>
          <input className="input uppercase" value={form.tag} onChange={set('tag')} minLength={2} maxLength={5} required />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">Описание</span>
        <textarea className="input resize-none" rows={3} maxLength={200} value={form.description} onChange={set('description')} placeholder="О чём ваш клан?" />
      </label>
      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Отмена</button>
        )}
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {busy ? 'Сохраняем…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
