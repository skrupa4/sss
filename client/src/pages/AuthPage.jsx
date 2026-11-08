import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/ui/Logo';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isLogin) await login(form.username, form.password);
      else await register(form.username, form.email, form.password);
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
          <p className="mt-2 text-sm text-muted">{isLogin ? 'С возвращением! Войдите в аккаунт.' : 'Создайте аккаунт за минуту.'}</p>
        </div>

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
            {busy ? 'Подождите…' : isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-ink hover:text-accent">
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
}
