import { useCallback } from 'react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useSocketEvent } from '../hooks/useSocketEvent';
import ChatList from '../components/messages/ChatList';
import ChatWindow from '../components/messages/ChatWindow';
import Icon from '../components/ui/Icons';

/** Сообщения в стиле Telegram: слева список чатов, справа переписка. На телефоне чат открывается на весь экран. */
export default function MessagesPage({ peer }) {
  const loader = useCallback(() => api.get('/api/messages/chats'), []);
  const { data: chats, loading, reload } = useAsync(loader, []);

  // Любое новое сообщение двигает чат наверх списка и обновляет счётчик непрочитанных.
  useSocketEvent('message:new', () => reload());

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[360px] overflow-hidden border-y border-line bg-surface md:border-x lg:h-[calc(100dvh-3rem)]">
      <section className={`flex w-full min-w-0 flex-col border-line md:w-80 md:shrink-0 md:border-r ${peer ? 'hidden md:flex' : 'flex'}`}>
        <ChatList chats={chats} loading={loading} activeUsername={peer} />
      </section>

      <section className={`min-w-0 flex-1 ${peer ? 'max-md:safe-top max-md:fixed max-md:inset-0 max-md:z-[55] max-md:flex max-md:bg-bg md:block' : 'hidden md:block'}`}>
        {peer ? (
          <ChatWindow key={peer} peer={peer} onRead={reload} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg text-muted">
            <span className="rounded-full bg-ink/[0.06] px-4 py-1.5 text-sm">Выберите, кому написать</span>
            <Icon name="chat" className="h-10 w-10 opacity-30" />
          </div>
        )}
      </section>
    </div>
  );
}
