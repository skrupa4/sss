import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Загрузка данных с состояниями loading / error и повтором — вместо «вечного» спиннера.
 * Данные перезагружаются при изменении deps; reload() стабилен и берёт свежий loader.
 */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reqId = useRef(0);
  const loaderRef = useRef(loader);

  useEffect(() => { loaderRef.current = loader; });

  const run = useCallback(async () => {
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === reqId.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === reqId.current) setState({ data: null, error, loading: false });
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
