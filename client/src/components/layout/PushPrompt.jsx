import { useEffect, useState } from 'react';
import { useToasts } from '../../context/ToastContext';
import { dismissPushPrompt, enablePush, needsInstall, pushDismissedRecently, pushSupported, syncPush } from '../../utils/push';
import Icon from '../ui/Icons';

/** Просьба включить уведомления: всплывает снизу после входа, пока пользователь не ответит. */
export default function PushPrompt() {
  const { push } = useToasts();
  const [mode, setMode] = useState(null); // 'ask' | 'install' | null
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pushDismissedRecently()) return undefined;
    let next = null;
    if (pushSupported() && Notification.permission === 'default') next = 'ask';
    else if (!pushSupported() && needsInstall()) next = 'install'; // iPhone: сначала нужно добавить сайт на экран «Домой»
    else syncPush();
    if (!next) return undefined;
    // Не пугаем окном в первую секунду: сначала даём человеку оглядеться.
    const timer = setTimeout(() => setMode(next), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!mode) return null;

  const close = () => { dismissPushPrompt(); setMode(null); };
  const accept = async () => {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result === 'granted') push({ type: 'info', emoji: '🔔', title: 'Уведомления включены', body: 'Сообщения и новости будут приходить и когда сайт закрыт.' });
      else if (result === 'denied') push({ type: 'info', emoji: '🔕', title: 'Уведомления заблокированы', body: 'Разрешить их можно в настройках браузера для этого сайта.' });
    } catch (err) {
      push({ type: 'info', emoji: '⚠️', title: 'Не получилось включить', body: err.message });
    } finally {
      setBusy(false);
      setMode(null);
    }
  };

  return (
    <div className="pop-in fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/30 lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0" role="dialog" aria-label="Уведомления">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon name="bell" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Включить уведомления?</p>
          {mode === 'ask' ? (
            <p className="mt-0.5 text-sm text-muted">Сообщения, лайки и подарки будут приходить на это устройство, даже когда сайт закрыт.</p>
          ) : (
            <p className="mt-0.5 text-sm text-muted">На iPhone уведомления работают, если добавить сайт на экран «Домой»: нажмите «Поделиться» → «На экран “Домой”», затем откройте SSS с иконки и включите уведомления в настройках.</p>
          )}
        </div>
        <button type="button" onClick={close} aria-label="Закрыть" className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted hover:bg-ink/[0.06] hover:text-ink">✕</button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={close} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Позже</button>
        {mode === 'ask' && (
          <button type="button" onClick={accept} disabled={busy} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy ? 'Включаем…' : 'Включить'}
          </button>
        )}
      </div>
    </div>
  );
}
