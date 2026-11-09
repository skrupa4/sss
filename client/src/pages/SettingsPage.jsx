import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import AccountSecurity from '../components/settings/AccountSecurity';
import Icon from '../components/ui/Icons';
import { useToasts } from '../context/ToastContext';
import { THEMES, getThemePref, setThemePref } from '../utils/theme';
import { currentSubscription, disablePush, enablePush, needsInstall, pushSupported } from '../utils/push';

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
      <h2 className="text-lg font-bold tracking-tight">Push-уведомления</h2>
      <p className="mt-1 text-sm text-muted">Сообщения, лайки, подарки и объявления приходят на это устройство, даже когда сайт закрыт.</p>
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

function Shortcuts() {
  const { user } = useAuth();
  const { counters } = useRealtime();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a href="#/coins" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-raised">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><Icon name="coin" /></span>
        <span className="min-w-0">
          <span className="block text-sm text-muted">Монеты</span>
          <span className="block text-xl font-extrabold tabular-nums">{(user.coins ?? 0).toLocaleString('ru-RU')}</span>
        </span>
        <span className="ml-auto text-sm font-semibold text-accent">Пополнить</span>
      </a>
      <a href="#/notifications" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-raised">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon name="bell" /></span>
        <span className="min-w-0">
          <span className="block text-sm text-muted">Уведомления</span>
          <span className="block text-base font-bold">{counters.notifications > 0 ? `${counters.notifications} новых` : 'Нет новых'}</span>
        </span>
        <span className="ml-auto text-sm font-semibold text-accent">Открыть</span>
      </a>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Настройки</h1>
      <Shortcuts />
      <Appearance />
      <Notifications />
      <AccountSecurity />
    </div>
  );
}
