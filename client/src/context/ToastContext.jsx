/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Icon from '../components/ui/Icons';

const ToastContext = createContext({ push: () => {} });

const DURATION = 5000;
const STYLES = {
  info: { icon: 'bell', ring: 'text-sky-400 bg-sky-400/10' },
  success: { icon: 'check', ring: 'text-ok bg-ok/10' },
  error: { icon: 'close', ring: 'text-accent bg-accent/10' },
  achievement: { icon: 'crown', ring: 'text-yellow-400 bg-yellow-400/10' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 260);
  }, []);

  // type: info | success | error | achievement
  const push = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.slice(-3), { type: 'info', ...toast, id }]);
    setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[3000] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6" aria-live="polite">
        {toasts.map((t) => {
          const style = STYLES[t.type] || STYLES.info;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { t.onClick?.(); dismiss(t.id); }}
              className={`${t.leaving ? 'toast-out' : 'toast-in'} pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-line bg-raised/95 px-4 py-3 text-left shadow-2xl shadow-black/50 backdrop-blur`}
            >
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base ${style.ring}`}>
                {t.emoji || <Icon name={style.icon} className="h-4 w-4" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{t.title}</span>
                {t.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{t.body}</span>}
              </span>
              <span className="toast-bar absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-accent to-accent-2" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToasts = () => useContext(ToastContext);
