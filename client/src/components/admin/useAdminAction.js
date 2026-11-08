import { useCallback, useState } from 'react';
import { useToasts } from '../../context/ToastContext';

// Выполняет действие админа: блокирует кнопки на время запроса и показывает результат тостом.
export function useAdminAction(onDone) {
  const { push } = useToasts();
  const [busyId, setBusyId] = useState(null);

  const run = useCallback(async (id, fn, successText) => {
    setBusyId(id);
    try {
      await fn();
      if (successText) push({ type: 'success', title: successText });
      await onDone?.();
    } catch (err) {
      push({ type: 'error', title: 'Не получилось', body: err.message });
    } finally {
      setBusyId(null);
    }
  }, [push, onDone]);

  return { run, busyId };
}
