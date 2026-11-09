import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { THEMES, getThemePref, setThemePref } from '../utils/theme';
import { currentSubscription, disablePush, enablePush, needsInstall, pushSupported } from '../utils/push';
import { profilePath } from '../utils/router';

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-ink/20'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Notifications() {
  const { push } = useToasts();
  const [state, setState] = useState('loading'); // loading | unsupported | install | denied | on | off
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let next;
      if (!pushSupported()) next = needsInstall() ? 'install' : 'unsupported';
      else if (Notification.permission === 'denied') next = 'denied';
      else next = Notification.permission === 'granted' && (await currentSubscription()) ? 'on' : 'off';
      if (alive) setState(next);
    })();
    return () => { alive = false; };
  }, []);

  const toggle = async (want) => {
    setBusy(true);
    try {
      if (want) {
        const result = await enablePush();
        setState(result === 'granted' ? 'on' : result === 'denied' ? 'denied' : 'off');
        if (result === 'granted') push({ type: 'info', emoji: '🔔', title: 'Уведомления включены', body: 'Теперь они приходят и на это устройство.' });
      } else {
        await disablePush();
        setState('off');
      }
    } catch (err) {
      push({ type: 'info', emoji: '⚠️', title: 'Не получилось', body: err.message });
    } finally {
      setBusy(false);
    }
  };

  const notes = {
    unsupported: 'Этот браузер не умеет присылать уведомления. Попробуйте Chrome, Safari или Firefox последней версии.',
    install: 'На iPhone уведомления работают, если добавить SSS на экран «Домой»: «Поделиться» → «На экран “Домой”». Откройте сайт с иконки и вернитесь сюда.',
    denied: 'Вы запретили уведомления для этого сайта. Разрешить их можно в настройках браузера (значок замка рядом с адресом).',
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold tracking-tight">Уведомления на телефон</h2>
      <p className="mt-1 text-sm text-muted">Сообщения, лайки, подарки и объявления приходят на устройство, даже когда сайт закрыт.</p>
      {notes[state] ? (
        <p className="mt-4 rounded-xl bg-raised px-4 py-3 text-sm text-muted">{notes[state]}</p>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-raised px-4 py-3">
          <div>
            <p className="font-medium">Это устройство</p>
            <p className="text-sm text-muted">{state === 'on' ? 'Уведомления включены' : state === 'loading' ? 'Проверяем…' : 'Уведомления выключены'}</p>
          </div>
          <Switch checked={state === 'on'} onChange={toggle} disabled={busy || state === 'loading'} label="Уведомления на этом устройстве" />
        </div>
      )}
    </section>
  );
}

function Appearance() {
  const [pref, setPref] = useState(getThemePref);
  const choose = (id) => { setPref(id); setThemePref(id); };
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold tracking-tight">Тема оформления</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Тема оформления">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={pref === t.id}
            onClick={() => choose(t.id)}
            className={`rounded-xl border p-3 text-left transition-colors ${pref === t.id ? 'border-accent bg-accent/10' : 'border-line hover:border-ink/25'}`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${pref === t.id ? 'border-accent' : 'border-faint'}`}>
                {pref === t.id && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              {t.label}
            </span>
            <span className="mt-1 block text-xs text-muted">{t.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Настройки</h1>
      <Appearance />
      <Notifications />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">Аккаунт</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`#${profilePath(user.username)}`} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-ink/[0.06]">Изменить профиль и тег клана</a>
          <button type="button" onClick={logout} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10">Выйти</button>
        </div>
      </section>
    </div>
  );
}
