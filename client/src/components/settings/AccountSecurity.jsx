import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToasts } from '../../context/ToastContext';
import Modal from '../ui/Modal';

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">{label}</span>
      {children}
    </label>
  );
}

function Actions({ busy, onCancel, submitLabel }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Отмена</button>
      <button type="submit" disabled={busy} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
        {busy ? 'Подождите…' : submitLabel}
      </button>
    </div>
  );
}

function PasswordForm({ onDone }) {
  const { push } = useToasts();
  const [form, setForm] = useState({ current: '', next: '', repeat: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.repeat) return setError('Новые пароли не совпадают');
    setBusy(true);
    setError('');
    try {
      await api.put('/api/account/password', { current: form.current, next: form.next });
      push({ type: 'info', emoji: '🔒', title: 'Пароль изменён', body: 'Используйте новый пароль при следующем входе.' });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Текущий пароль"><input className="input" type="password" value={form.current} onChange={set('current')} autoComplete="current-password" required /></Field>
      <Field label="Новый пароль (от 6 символов)"><input className="input" type="password" value={form.next} onChange={set('next')} autoComplete="new-password" minLength={6} required /></Field>
      <Field label="Повторите новый пароль"><input className="input" type="password" value={form.repeat} onChange={set('repeat')} autoComplete="new-password" minLength={6} required /></Field>
      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <Actions busy={busy} onCancel={onDone} submitLabel="Сменить пароль" />
    </form>
  );
}

function EmailForm({ onDone }) {
  const { user, updateUser } = useAuth();
  const { push } = useToasts();
  const [step, setStep] = useState('form'); // form | code
  const [form, setForm] = useState({ password: '', email: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const finish = (email) => {
    updateUser((u) => (u ? { ...u, email } : u));
    push({ type: 'info', emoji: '✉️', title: 'Почта изменена', body: email });
    onDone();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (step === 'form') {
        const res = await api.post('/api/account/email', { password: form.password, email: form.email });
        if (res.changed) return finish(res.email);
        setStep('code');
      } else {
        const res = await api.post('/api/account/email/confirm', { code: form.code });
        return finish(res.email);
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {step === 'form' ? (
        <>
          <p className="text-sm text-muted">Сейчас: <b className="text-ink">{user.email || 'не указана'}</b></p>
          <Field label="Новая почта"><input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></Field>
          <Field label="Пароль для подтверждения"><input className="input" type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required /></Field>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Мы отправили код на <b className="text-ink">{form.email}</b>. Он действует 10 минут.</p>
          <Field label="Код из письма">
            <input className="input text-center text-xl font-bold tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, '') }))} required autoFocus />
          </Field>
        </>
      )}
      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <Actions busy={busy} onCancel={onDone} submitLabel={step === 'form' ? 'Продолжить' : 'Подтвердить'} />
    </form>
  );
}

/** Раздел «Аккаунт» в настройках: пароль, почта, выход. */
export default function AccountSecurity() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(null); // 'password' | 'email'
  const close = () => setOpen(null);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold tracking-tight">Аккаунт</h2>
      <p className="mt-1 text-sm text-muted">Почта: <span className="text-ink">{user.email || 'не указана'}</span></p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen('password')} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-ink/[0.06]">Сменить пароль</button>
        <button type="button" onClick={() => setOpen('email')} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-ink/[0.06]">Сменить почту</button>
        <button type="button" onClick={logout} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10">Выйти</button>
      </div>
      <Modal open={open === 'password'} onClose={close} title="Смена пароля" size="sm"><PasswordForm onDone={close} /></Modal>
      <Modal open={open === 'email'} onClose={close} title="Смена почты" size="sm"><EmailForm onDone={close} /></Modal>
    </section>
  );
}
