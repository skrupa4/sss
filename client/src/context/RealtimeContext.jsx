/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE, api, tokenStore } from '../api/client';
import { useAuth } from './AuthContext';
import { useToasts } from './ToastContext';
import { messagesPath, navigate, profilePath } from '../utils/router';

const RealtimeContext = createContext(null);

const NOTIFICATION_TEXT = {
  follow: () => 'подписался на вас',
  like: () => 'оценил ваш пост',
  comment: (n) => `прокомментировал: «${(n.content || '').slice(0, 60)}»`,
  repost: () => 'сделал репост вашего поста',
  clan_join: (n) => `вступил в ваш клан «${n.content || ''}»`,
  // Системные уведомления приходят не от пользователя, поэтому без «@имя».
  achievement: (n) => `Новое достижение: ${n.content}`,
  announcement: (n) => n.content,
  gift: (n) => `подарил вам подарок «${n.content}»`,
  gift_anon: (n) => `Вам подарили «${n.content}» 🎁`,
  verification_request: () => 'отправил заявку на галочку',
  verification_approved: () => 'Заявка одобрена — ваш аккаунт подтверждён ✅',
  verification_rejected: (n) => (n.content ? `Заявка на галочку отклонена: ${n.content}` : 'Заявка на галочку отклонена'),
};
const SYSTEM_TYPES = new Set(['achievement', 'announcement', 'gift_anon', 'verification_approved', 'verification_rejected']);
export const isSystemNotification = (n) => SYSTEM_TYPES.has(n.type);
export const notificationText = (n) => (NOTIFICATION_TEXT[n.type] || (() => 'новое уведомление'))(n);

/**
 * Держит одно WebSocket-соединение на всё приложение и хранит счётчики для бейджей в меню.
 * Сервер пушит события — страницы не нужно обновлять и опрашивать по таймеру.
 */
export function RealtimeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const { push } = useToasts();
  const [socket, setSocket] = useState(null);
  const [counters, setCounters] = useState({ messages: 0, notifications: 0 });
  const [connected, setConnected] = useState(false);
  const openChatRef = useRef(null); // с кем сейчас открыт чат — для него тосты не показываем

  const refreshCounters = useCallback(() => {
    api.get('/api/notifications/counters').then(setCounters).catch(() => {});
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    const s = io(API_BASE, {
      auth: (cb) => cb({ token: tokenStore.get() }),
      reconnectionDelayMax: 10_000,
    });
    // Сокет — внешняя система: создаём его в эффекте и сообщаем компонентам.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);
      refreshCounters(); // догоняем всё, что пришло, пока связи не было
    });
    s.on('disconnect', () => setConnected(false));
    s.on('counters', setCounters);

    refreshCounters();
    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId, refreshCounters]);

  // Всплывающие уведомления.
  useEffect(() => {
    if (!socket) return undefined;
    const onNotification = (n) => push({
      title: isSystemNotification(n) ? 'SSS' : `@${n.user_from}`,
      body: notificationText(n),
      onClick: () => {
        if (['follow', 'clan_join', 'gift'].includes(n.type)) navigate(profilePath(n.user_from));
        else if (n.type === 'verification_request') navigate('/admin');
        else if (n.type === 'gift_anon') navigate(profilePath(user.username));
        else navigate('/notifications');
      },
    });
    const onMessage = (m) => {
      if (m.sender === user.username || openChatRef.current === m.sender) return;
      push({
        title: `Сообщение от @${m.sender}`,
        body: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
        onClick: () => navigate(messagesPath(m.sender)),
      });
    };
    const onAchievement = (a) => push({
      type: 'achievement',
      emoji: a.icon,
      title: 'Новое достижение!',
      body: `${a.title} — ${a.description}${a.reward ? ` · +${a.reward} 🪙` : ''}`,
      onClick: () => navigate(profilePath(user.username)),
    });
    const onAnnouncement = (a) => {
      refreshCounters();
      push({ type: 'info', emoji: '📢', title: 'Объявление', body: a.content, onClick: () => navigate('/notifications') });
    };
    socket.on('notification:new', onNotification);
    socket.on('message:new', onMessage);
    socket.on('achievement:unlocked', onAchievement);
    socket.on('announcement', onAnnouncement);
    // Баланс монет приходит с сервера при любом изменении (награда, покупка, подарок).
    const onCoins = ({ coins }) => updateUser((u) => (u ? { ...u, coins } : u));
    socket.on('coins', onCoins);
    return () => {
      socket.off('notification:new', onNotification);
      socket.off('message:new', onMessage);
      socket.off('achievement:unlocked', onAchievement);
      socket.off('announcement', onAnnouncement);
      socket.off('coins', onCoins);
    };
  }, [socket, push, user?.username, refreshCounters, updateUser]);

  const value = useMemo(() => ({ socket, counters, connected, openChatRef, refreshCounters }), [socket, counters, connected, refreshCounters]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);
