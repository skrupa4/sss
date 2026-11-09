import { useCallback } from 'react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useSocketEvent } from '../hooks/useSocketEvent';
import ChatList from '../components/messages/ChatList';
import ChatWindow from '../components/messages/ChatWindow';
import Icon from '../components/ui/Icons';

export default function MessagesPage({ peer }) {
  const loader = useCallback(() => api.get('/api/messages/chats'), []);
  const { data: chats, loading, reload } = useAsync(loader, []);

  // Любое новое сообщение двигает чат наверх списка и обновляет счётчик непрочитанных.
  useSocketEvent('message:new', () => reload());

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[360px] overflow-hidden rounded-3xl border border-line bg-surface lg:h-[calc(100dvh-3rem)]">
      <section className={`flex w-full flex-col border-line md:w-80 md:shrink-0 md:border-r ${peer ? 'hidden md:flex' : 'flex'}`}>
        <h1 className="flex h-16 shrink-0 items-center border-b border-line px-4 text-xl font-extrabold tracking-tight">Сообщения</h1>
        <ChatList chats={chats} loading={loading} activeUsername={peer} />
      </section>

      <section className={`min-w-0 flex-1 ${peer ? 'block' : 'hidden md:block'}`}>
        {peer ? (
          <ChatWindow key={peer} peer={peer} onRead={reload} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
            <Icon name="chat" className="h-10 w-10 opacity-40" />
            <p className="text-sm">Выберите чат слева</p>
          </div>
        )}
      </section>
    </div>
  );
}
