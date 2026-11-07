/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[1000] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { t.onClick?.(); dismiss(t.id); }}
            className="toast-in pointer-events-auto w-full max-w-sm rounded-2xl border border-line bg-raised px-4 py-3 text-left shadow-2xl shadow-black/50"
          >
            <p className="text-sm font-semibold text-ink">{t.title}</p>
            {t.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{t.body}</p>}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToasts = () => useContext(ToastContext);
