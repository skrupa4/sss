/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Modal from '../components/ui/Modal';

const DialogContext = createContext(null);

/** Красивое подтверждение вместо window.confirm: `if (await confirm({ title, message })) …` */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...options, resolve, open: true });
  }), []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog((d) => (d ? { ...d, open: false } : d));
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal open={Boolean(dialog?.open)} onClose={() => close(false)} size="sm" title={dialog?.title}>
        <p className="text-[15px] leading-relaxed text-muted">{dialog?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => close(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
            {dialog?.cancelLabel || 'Отмена'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 ${dialog?.danger ? 'bg-red-500' : 'bg-accent'}`}
          >
            {dialog?.confirmLabel || 'Подтвердить'}
          </button>
        </div>
      </Modal>
    </DialogContext.Provider>
  );
}

export const useConfirm = () => useContext(DialogContext).confirm;
