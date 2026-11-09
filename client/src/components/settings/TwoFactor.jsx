import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToasts } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import Modal from '../ui/Modal';

function EnableForm({ onDone }) {
  const { updateUser } = useAuth();
  const { push } = useToasts();
  const [step, setStep] = useState('password'); // password | code
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (step === 'password') {
        const res = await api.post('/api/account/2fa/start', { password });
        setSentTo(res.email);
        setStep('code');
      } else {
        await api.post('/api/account/2fa/confirm', { code });
        updateUser((u) => (u ? { ...u, two_factor: true } : u));
        push({ type: 'info', emoji: '🛡️', title: 'Двухфакторная защита включена', body: 'При входе потребуется код из письма.' });
        return onDone();
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {step === 'password' ? (
        <>
          <p className="text-sm text-muted">Подтвердите пароль. Мы отправим код на вашу текущую почту.</p>
          <label className="block text-sm"><span className="mb-1.5 block text-muted">Пароль</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required autoFocus />
          </label>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Код отправлен на <b className="text-ink">{sentTo}</b>. Он действует 10 минут.</p>
          <input className="input text-center text-xl font-bold tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Код из письма" required autoFocus />
        </>
      )}
      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Отмена</button>
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {busy ? 'Подождите…' : step === 'password' ? 'Отправить код' : 'Включить'}
        </button>
      </div>
    </form>
  );
}

function DisableForm({ onDone }) {
  const { updateUser } = useAuth();
  const { push } = useToasts();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/account/2fa/disable', { password });
      updateUser((u) => (u ? { ...u, two_factor: false } : u));
      push({ type: 'info', emoji: '🔓', title: 'Двухфакторная защита отключена' });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted">Без второго шага вход будет защищён только паролем. Введите пароль, чтобы отключить.</p>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Пароль" aria-label="Пароль" required autoFocus />
      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Отмена</button>
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">{busy ? 'Подождите…' : 'Отключить'}</button>
      </div>
    </form>
  );
}

/** Двухфакторная защита: после пароля при входе нужен код из письма. */
export default function TwoFactor() {
  const { user } = useAuth();
  const [open, setOpen] = useState(null); // 'enable' | 'disable'
  const { data: config } = useAsync(() => api.get('/api/register/config'), []);
  const on = Boolean(user.two_factor);
  const mailReady = config?.mail !== false;
  const close = () => setOpen(null);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Двухфакторная защита</h2>
          <p className="mt-1 text-sm text-muted">После пароля при входе мы отправляем 6-значный код на вашу почту. Так аккаунт не взломать, даже если пароль утёк.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Двухфакторная защита"
          disabled={!on && !mailReady}
          onClick={() => setOpen(on ? 'disable' : 'enable')}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-ink/20'}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      {!mailReady && !on && <p className="mt-3 rounded-xl bg-raised px-4 py-3 text-sm text-muted">Сейчас включить нельзя: на сервере не настроена отправка почты.</p>}
      {on && <p className="mt-3 text-sm text-ok">Включена. Код придёт на {user.email}.</p>}
      <Modal open={open === 'enable'} onClose={close} title="Включить защиту" size="sm"><EnableForm onDone={close} /></Modal>
      <Modal open={open === 'disable'} onClose={close} title="Отключить защиту" size="sm"><DisableForm onDone={close} /></Modal>
    </section>
  );
}
