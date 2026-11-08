import { useState } from 'react';
import { api } from '../../api/client';
import { useToasts } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { ErrorState, Spinner } from '../ui/Spinner';

function TrialSettings() {
  const { push } = useToasts();
  const { data, loading, error, reload } = useAsync(() => api.get('/api/admin/settings'), []);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  const form = draft || data;

  const save = async () => {
    setBusy(true);
    try {
      const saved = await api.put('/api/admin/settings', {
        premium_trial_enabled: form.premium_trial_enabled,
        premium_trial_days: Number(form.premium_trial_days),
      });
      setDraft(saved);
      push({ type: 'success', title: 'Настройки сохранены' });
    } catch (err) {
      push({ type: 'error', title: 'Не сохранилось', body: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold tracking-tight">Пробный Premium</h2>
      <p className="mt-1 text-sm text-muted">Бесплатный период, который каждый пользователь может включить один раз.</p>
      <label className="mt-4 flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[#ff2a5f]" checked={form.premium_trial_enabled} onChange={(e) => setDraft({ ...form, premium_trial_enabled: e.target.checked })} />
        Пробный период включён
      </label>
      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block text-muted">Длительность, дней</span>
        <input className="input !w-32" type="number" min={1} max={365} value={form.premium_trial_days} onChange={(e) => setDraft({ ...form, premium_trial_days: e.target.value })} />
      </label>
      <button type="button" onClick={save} disabled={busy} className="mt-5 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
        {busy ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </section>
  );
}

function Announce() {
  const { push } = useToasts();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const res = await api.post('/api/admin/announce', { text });
      push({ type: 'success', title: 'Объявление отправлено', body: `Получателей: ${res.recipients}` });
      setText('');
    } catch (err) {
      push({ type: 'error', title: 'Не отправилось', body: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold tracking-tight">Объявление для всех</h2>
      <p className="mt-1 text-sm text-muted">Появится у всех в уведомлениях, а у тех, кто сейчас на сайте, — всплывающим окном.</p>
      <textarea className="input mt-4 resize-none" rows={3} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Например: сегодня ночью обновление сервера" />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">{text.length}/200</span>
        <button type="button" onClick={send} disabled={busy || !text.trim()} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
          {busy ? 'Отправляем…' : 'Отправить всем'}
        </button>
      </div>
    </section>
  );
}

export default function SettingsTab() {
  return (
    <div className="flex flex-col gap-3">
      <TrialSettings />
      <Announce />
    </div>
  );
}
