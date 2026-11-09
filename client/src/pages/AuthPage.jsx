import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/ui/Logo';

const RESEND_SECONDS = 60;

// Второй шаг регистрации: ввод 6-значного кода из письма.
function CodeStep({ email, title, onSubmit, onResend, onBack }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(code);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      await onResend();
      setInfo('Новый код отправлен');
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-surface p-6">
      <div className="text-center">
        <p className="text-4xl">📬</p>
        <h2 className="mt-2 text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">Мы отправили 6-значный код на <b className="text-ink">{email}</b>. Проверьте и папку «Спам».</p>
      </div>
      <input
        className="input text-center text-2xl font-bold tracking-[0.5em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="••••••"
        aria-label="Код из письма"
        autoFocus
        required
      />
      {error && <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">{error}</p>}
      {info && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok" role="status">{info}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
        {busy ? 'Проверяем…' : 'Подтвердить'}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted hover:text-ink">← Назад</button>
        <button type="button" onClick={resend} disabled={wait > 0} className="font-semibold text-ink hover:text-accent disabled:text-faint disabled:hover:text-faint">
          {wait > 0 ? `Отправить ещё раз (${wait})` : 'Отправить ещё раз'}
        </button>
      </div>
    </form>
  );
}

export default function AuthPage() {
  const { login, register, verifyRegistration, resendCode, verifyLogin, resendLoginCode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Шаг с кодом из письма: { kind: 'register' | 'login', email, ticket? }
  const [step, setStep] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isLogin) {
        const res = await login(form.username, form.password);
        if (res?.needs2fa) { setStep({ kind: 'login', email: res.email, ticket: res.ticket }); setBusy(false); }
      } else {
        const res = await register(form.username, form.email, form.password);
        if (res?.needsCode) { setStep({ kind: 'register', email: res.email }); setBusy(false); }
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="flex justify-center"><Logo size="lg" /></h1>
          <p className="mt-2 text-sm text-muted">{step ? 'Остался один шаг.' : isLogin ? 'С возвращением! Войдите в аккаунт.' : 'Создайте аккаунт за минуту.'}</p>
        </div>

        {step ? (
          <CodeStep
            key={step.kind}
            email={step.email}
            title={step.kind === 'login' ? 'Двухфакторная защита' : 'Подтвердите почту'}
            onSubmit={(code) => (step.kind === 'login' ? verifyLogin(step.ticket, code) : verifyRegistration(step.email, code))}
            onResend={() => (step.kind === 'login' ? resendLoginCode(step.ticket) : resendCode(step.email))}
            onBack={() => { setStep(null); setForm((f) => ({ ...f, password: '' })); }}
          />
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3 rounded-3xl border border-line bg-surface p-6">
              <label className="block text-sm">
                <span className="mb-1.5 block text-muted">{isLogin ? 'Никнейм или email' : 'Никнейм'}</span>
                <input className="input" value={form.username} onChange={set('username')} autoComplete="username" maxLength={120} required />
              </label>
              {!isLogin && (
                <label className="block text-sm">
                  <span className="mb-1.5 block text-muted">Email</span>
                  <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
                </label>
              )}
              <label className="block text-sm">
                <span className="mb-1.5 block text-muted">Пароль</span>
                <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={isLogin ? undefined : 6} required />
              </label>

              {error && <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">{error}</p>}

              <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                {busy ? 'Подождите…' : isLogin ? 'Войти' : 'Продолжить'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-ink hover:text-accent">
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
