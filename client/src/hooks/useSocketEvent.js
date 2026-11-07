import { useEffect, useRef } from 'react';
import { useRealtime } from '../context/RealtimeContext';

// Подписка на событие сокета на время жизни компонента.
export function useSocketEvent(event, handler) {
  const { socket } = useRealtime();
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (...args) => handlerRef.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
