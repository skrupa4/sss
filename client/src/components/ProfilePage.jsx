import React, { useState, useEffect, useCallback, useRef } from 'react';
import CryptoJS from 'crypto-js';
import Sidebar from './Sidebar';
import Messenger from './Messenger';

const SECRET_KEY = 'abcdefghijklmnopqrstuvwxyz123456'; 

// Функции-хелперы для сквозного шифрования (End-to-End на клиенте)
const encryptClient = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
const decryptClient = (cipherText) => {
  if (!cipherText) return '';
  try {
    if (!cipherText.startsWith('U2FsdGVkX1')) return cipherText; 
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) { return cipherText; }
};

// Твой рабочий бэкенд на Render
const API_BASE_URL = 'https://sss-backend-haev.onrender.com';

// Вспомогательная функция для генерации градиента на основе имени
const getAvatarGradient = (username) => {
  if (!username) return 'from-gray-700 to-gray-900';
  const charCodeSum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-[#ff2a5f] to-[#7e22ce]', // Фирменный SSS
    'from-[#00f2fe] to-[#4facfe]', // Кибер-синий
    'from-[#f9d423] to-[#ff4e50]', // Огненный закат
    'from-[#b1f4cf] to-[#9890e3]', // Неоновая пастель
    'from-[#f11712] to-[#190e17]', // Дарк-хоррор
    'from-[#00c6ff] to-[#0072ff]', // Королевский синий
    'from-[#f857a6] to-[#ff5858]', // Розовый неон
    'from-[#11998e] to-[#38ef7d]', // Изумруд
  ];
  return gradients[charCodeSum % gradients.length];
};

// Набор популярных эмодзи для быстрой вставки
const EMOJI_LIST = ['😀', '😂', '🤣', '😊', '😍', '😘', '😜', '😎', '🔥', '👑', '💎', '✨', '💀', '🤡', '💩', '👻', '👾', '👿', '❤️', '💔', '💯', '👍', '👎', '✊', '✌️', '🚀', '💵', '🪐'];

const ProfilePage = ({ user, onLogout, onUpdateUser }) => {
  const hasPremium = true;

  const [view, setView] = useState('profile'); // 'profile' | 'feed' | 'messages' | 'notifications'
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [activePostComments, setActivePostComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Состояния для переключателей панелей эмодзи
  const [showPostEmoji, setShowPostEmoji] = useState(false);
  const [showCommentEmoji, setShowCommentEmoji] = useState({}); // { [postId]: boolean }

  // Рефы для точной вставки эмодзи по позиции курсора
  const postInputRef = useRef(null);
  const commentInputRefs = useRef({}); // { [postId]: element }

  const [currentProfile, setCurrentProfile] = useState(user.username);
  const isOwnProfile = currentProfile === user.username;

  const [isLoading, setIsLoading] = useState(true);
  const [shouldRenderLoader, setShouldRenderLoader] = useState(true);
  const [animateContent, setAnimateContent] = useState(false);

  const [profileData, setProfileData] = useState({
    username: '',
    handle: '',
    followers: 0,
    following: 0,
    memberSince: 'Май 2026',
    clan: 'Отсутствует',
    isSubscribed: false,
    is_verified: false
  });

  // СОСТОЯНИЯ ДЛЯ ЛИЧНЫХ СООБЩЕНИЙ
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  // Скролл к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (view === 'messages' && activeChat) {
      scrollToBottom();
    }
  }, [messages, view, activeChat]);

  // Загрузка списка чатов
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/chats?username=${user.username}`);
      if (res.ok) {
        const data = await res.json();
        const decryptedChats = (Array.isArray(data) ? data : []).map(c => ({
          ...c,
          last_message: decryptClient(c.last_message)
        }));
        setChats(decryptedChats);
      }
    } catch (err) { console.error("Ошибка загрузки чатов:", err); }
  }, [user.username]);

  const loadMessages = useCallback(async (withUser) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/history?user1=${user.username}&user2=${withUser}`);
      if (res.ok) {
        const data = await res.json();
        const decryptedMsgs = (Array.isArray(data) ? data : []).map(m => ({
          ...m,
          content: decryptClient(m.content)
        }));
        setMessages(decryptedMsgs);
      }
    } catch (err) { console.error("Ошибка загрузки сообщений:", err); }
  }, [user.username]);

  // Загрузка общего количества непрочитанных
  const loadTotalUnread = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/unread/total?username=${user.username}`);
      if (res.ok) {
        const data = await res.json();
        setTotalUnread(data.total || 0);
      }
    } catch (err) { console.error(err); }
  }, [user.username]);

  // Интервал для обновления чата, сообщений и счетчиков (Каждую 1 секунду)
  useEffect(() => {
    loadChats();
    loadTotalUnread();

    const interval = setInterval(() => {
      loadChats();
      loadTotalUnread();
      if (view === 'messages' && activeChat) {
        loadMessages(activeChat.username);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [view, activeChat, loadChats, loadMessages, loadTotalUnread]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    const textToSend = messageInput;
    setMessageInput(''); 

    try {
      const encrypted = encryptClient(textToSend);

      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: user.username,
          receiver: activeChat.username,
          content: encrypted
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        newMsg.content = decryptClient(newMsg.content);
        setMessages(prev => [...prev, newMsg]);
        loadChats(); 
        loadTotalUnread();
      }
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
    }
  };

  const handleOpenChatFromProfile = (targetUser) => {
    setAnimateContent(false);
    setActiveChat({ username: targetUser });
    loadMessages(targetUser);
    setView('messages');
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setShouldRenderLoader(true);
      setAnimateContent(false);

      if (view === 'messages') {
        await loadChats();
        if (activeChat) {
          await loadMessages(activeChat.username);
        }
      } else if (view !== 'notifications') {
        const userRes = await fetch(`${API_BASE_URL}/api/users/${currentProfile}?viewer=${user.username}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setProfileData(prev => ({ ...prev, ...userData }));
        } else {
          setProfileData(prev => ({ ...prev, username: currentProfile, handle: currentProfile }));
        }

        let postsUrl = '';
        if (view === 'feed') {
          postsUrl = `${API_BASE_URL}/api/posts`;
        } else {
          postsUrl = activeTab === 'posts'
            ? `${API_BASE_URL}/api/posts/user/${currentProfile}`
            : `${API_BASE_URL}/api/posts/reposts/${currentProfile}`;
        }

        const postsRes = await fetch(postsUrl);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(Array.isArray(postsData) ? postsData : []);
        }
      }
    } catch (err) {
      console.error("Ошибка загрузки данных с бэкенда:", err);
      setPosts([]);
      setProfileData(prev => ({ ...prev, username: currentProfile, handle: currentProfile }));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setShouldRenderLoader(false);
        setAnimateContent(true);
      }, 300);
    }
  }, [currentProfile, view, activeTab, user.username, activeChat, loadChats, loadMessages]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewChange = (newView, targetProfile = null) => {
    setAnimateContent(false);
    if (targetProfile) setCurrentProfile(targetProfile);
    setView(newView);
    if (newView === 'profile') setActiveTab('posts');
    if (newView !== 'messages') setActiveChat(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (newTab) => {
    setAnimateContent(false);
    setActiveTab(newTab);
  };

  const handleFollow = async () => {
    try {
      const isSub = profileData.isSubscribed;
      const res = await fetch(`${API_BASE_URL}/api/users/${currentProfile}/follow`, {
        method: isSub ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: user.username })
      });

      if (res.ok) {
        setProfileData(prev => ({
          ...prev,
          isSubscribed: !isSub,
          followers: isSub ? Math.max(0, prev.followers - 1) : prev.followers + 1
        }));
      }
    } catch (err) {
      console.error("Ошибка подписки:", err);
    }
  };

  const handleSaveProfile = async () => {
    if (isEditing) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${user.username}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: profileData.username,
            handle: profileData.handle
          }),
        });
        
        if (res.ok) {
          const updated = await res.json();
          setIsEditing(false);
          if (onUpdateUser) onUpdateUser(updated);
          if (isOwnProfile && updated.username !== currentProfile) {
            setCurrentProfile(updated.username);
          }
        }
      } catch (err) {
        console.error("Ошибка сохранения:", err);
      }
    }
    setIsEditing(!isEditing);
  };

  const handlePublish = async () => {
    if (!postText.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, content: postText }),
      });
      if (response.ok) {
        const savedPost = await response.json();
        if (view === 'feed' || (isOwnProfile && activeTab === 'posts')) {
          setPosts(prev => [savedPost, ...prev]);
        }
        setPostText('');
        setShowPostEmoji(false);
      }
    } catch (err) { console.error("Ошибка публикации:", err); }
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: data.likes } : p));
      }
    } catch (err) { console.error(err); }
  };

  const toggleComments = async (postId) => {
    if (activePostComments[postId]) {
      const newComments = { ...activePostComments };
      delete newComments[postId];
      setActivePostComments(newComments);
      setShowCommentEmoji(prev => ({ ...prev, [postId]: false }));
    } else {
      try {
        const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);
        const data = await res.json();
        setActivePostComments(prev => ({ ...prev, [postId]: data }));
      } catch (err) { console.error(err); }
    }
  };

  const handleSendComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, content: text })
      });
      if (res.ok) {
        const newComment = await res.json();
        setActivePostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment]
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setShowCommentEmoji(prev => ({ ...prev, [postId]: false }));
      }
    } catch (err) { console.error(err); }
  };

  const handleRepost = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, reposts: data.reposts } : p));
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (postId) => {
    try {
      const isRepostDelete = activeTab === 'reposts' && isOwnProfile;
      const url = isRepostDelete
        ? `${API_BASE_URL}/api/posts/${postId}/repost`
        : `${API_BASE_URL}/api/posts/${postId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });

      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) { console.error(err); }
  };

  const addEmojiToPost = (emoji) => {
    const textarea = postInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setPostText(before + emoji + after);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    }, 0);
  };

  const addEmojiToComment = (postId, emoji) => {
    const input = commentInputRefs.current[postId];
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = commentInputs[postId] || '';
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setCommentInputs(prev => ({
      ...prev,
      [postId]: before + emoji + after
    }));

    setTimeout(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + emoji.length;
    }, 0);
  };

  const ActionButtons = ({ isMobile = false }) => {
    const btnClasses = isMobile
      ? "btn-fixed flex-1 px-3 py-1.5 h-8 rounded-lg text-[9px] font-black uppercase transition-all border flex items-center justify-center gap-1.5"
      : "btn-fixed flex-1 md:flex-none px-5 py-2.5 h-11 md:h-11 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center justify-center gap-2";

    const premiumClasses = isMobile
      ? "btn-fixed flex-1 bg-gradient-to-r from-[#ff2a5f] to-[#7e22ce] text-white px-3 py-1.5 h-8 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-[#ff2a5f]/20 text-center flex items-center justify-center"
      : "btn-fixed flex-1 md:flex-none bg-gradient-to-r from-[#ff2a5f] to-[#7e22ce] text-white px-5 py-2.5 h-11 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[#ff2a5f]/20 text-center flex items-center justify-center";

    return (
      <>
        {isOwnProfile ? (
          <button
            onClick={handleSaveProfile}
            className={`${btnClasses} ${isEditing
                ? 'bg-[#ff2a5f] border-[#ff2a5f] text-white shadow-lg shadow-[#ff2a5f]/20'
                : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black'
              }`}
          >
            {isEditing ? (
              <svg className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
            <span>{isEditing ? 'Сохранить' : 'Редактировать'}</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleFollow}
              className={`btn-fixed flex-1 ${isMobile ? 'px-3 py-1.5 h-8 rounded-lg text-[9px]' : 'md:flex-none px-5 py-2.5 h-11 rounded-xl text-[10px]'} font-black uppercase transition-all cursor-pointer border ${profileData.isSubscribed ? 'bg-white/5 border-white/10 text-white' : 'bg-[#ff2a5f] border-[#ff2a5f] text-white shadow-lg shadow-[#ff2a5f]/20 hover:scale-105 active:scale-95'}`}>
              {profileData.isSubscribed ? 'Отписаться' : 'Подписаться'}
            </button>
            
            <button
              onClick={() => handleOpenChatFromProfile(profileData.username)}
              className={`btn-fixed flex-1 bg-white/5 border-white/10 text-white hover:bg-white hover:text-black ${isMobile ? 'px-3 py-1.5 h-8 rounded-lg text-[9px]' : 'md:flex-none px-5 py-2.5 h-11 rounded-xl text-[10px]'} font-black uppercase transition-all flex items-center justify-center gap-1.5`}
            >
              <svg className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>ЛС</span>
            </button>
          </>
        )}
        <button className={premiumClasses}>Premium</button>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex justify-center items-start pt-4 md:pt-8 px-3 md:px-6 pb-24 lg:pb-8 antialiased"
         style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      <style>{`
        @keyframes flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .premium-nick { background: linear-gradient(90deg, #ff2a5f, #7e22ce, #ff2a5f); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: flow 3s linear infinite; }
        .glass-card { background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.04); }
        .sss-logo { background: linear-gradient(135deg, #fff 0%, #ff2a5f 50%, #7e22ce 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 8px rgba(255, 42, 95, 0.4)); }
        .edit-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 10px; outline: none; width: 100%; color: white; font-size: 14px; }
        .achievement-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; }
        .achievement-card:hover { transform: translateY(-5px) rotate(-8deg) scale(1.1); box-shadow: 0 10px 20px rgba(255, 42, 95, 0.2); }
        .interact-btn { display: flex; align-items: center; gap: 6px; color: #444; transition: all 0.2s; cursor: pointer; border: none; background: none; outline: none; }
        .interact-btn svg { width: 16px; height: 16px; stroke-width: 2.5; }
        .interact-btn:hover { color: #fff; }
        .interact-btn.active { color: #ff2a5f; }
        .interact-btn span { font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .comment-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 8px 12px; width: 100%; outline: none; color: white; font-size: 13px; }
        .btn-fixed { flex-shrink: 0 !important; white-space: nowrap !important; }
        .fade-loader { transition: opacity 0.30s ease-in-out, visibility 0.30s; opacity: 1; visibility: visible; }
        .fade-loader.hidden { opacity: 0; visibility: hidden; }
        .animated-content { opacity: 0; transform: translateY(10px); transition: opacity 0.4s cubic-bezier(0.215, 0.610, 0.355, 1), transform 0.4s cubic-bezier(0.215, 0.610, 0.355, 1); }
        .animated-content.visible { opacity: 1; transform: translateY(0); }
        .neon-spinner { width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.03); border-top-color: #ff2a5f; border-radius: 50%; animation: spin 0.8s linear infinite; filter: drop-shadow(0 0 6px #ff2a5f); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {shouldRenderLoader && (
        <div className={`fixed inset-0 bg-[#080808] z-[9999] flex flex-col gap-4 items-center justify-center fade-loader ${!isLoading ? 'hidden' : ''}`}>
          <div className="neon-spinner"></div>
          <div className="text-gray-500 font-black uppercase text-[10px] tracking-[0.25em] sss-logo">Загрузка данных...</div>
        </div>
      )}

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-6 justify-center">
         
        {/* ИСПОЛЬЗУЕМ ВЫНЕСЕННЫЙ САЙДБАР */}
        <Sidebar 
          view={view}
          isOwnProfile={isOwnProfile}
          totalUnread={totalUnread}
          user={user}
          handleViewChange={handleViewChange}
          onLogout={onLogout}
        />

        {/* Основной контент */}
        <main className={`flex-1 w-full max-w-[680px] flex flex-col gap-4 md:gap-5 animated-content ${animateContent ? 'visible' : ''}`}>
          
          {/* ИСПОЛЬЗУЕМ ВЫНЕСЕННЫЙ МЕССЕНДЖЕР */}
          {view === 'messages' && (
            <Messenger 
              chats={chats}
              activeChat={activeChat}
              messages={messages}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              handleSendMessage={handleSendMessage}
              setActiveChat={setActiveChat}
              loadMessages={loadMessages}
              messagesEndRef={messagesEndRef}
            />
          )}

          {/* УВЕДОМЛЕНИЯ */}
          {view === 'notifications' && (
            <div className="glass-card rounded-2xl md:rounded-[28px] p-8 text-center border-dashed border-white/5 select-none">
              <p className="text-gray-600 font-black uppercase text-[11px] tracking-[0.2em]">Уведомлений пока нет</p>
            </div>
          )}

          {/* ПРОФИЛЬ И ЛЕНТА */}
          {view !== 'messages' && view !== 'notifications' && (
            <>
              {/* Шапка профиля */}
              {view === 'profile' && (
                <div className="glass-card rounded-3xl md:rounded-[36px] p-4 md:p-7 flex flex-col gap-5 md:gap-6 relative overflow-hidden shadow-2xl">
                  <div className="flex flex-col md:flex-row gap-5 items-center md:items-start text-center md:text-left relative z-10">
                    <div className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-[32px] bg-gradient-to-tr ${getAvatarGradient(profileData.username)} flex items-center justify-center text-white text-3xl md:text-4xl font-black italic shadow-2xl border border-white/10 select-none`}>
                      {profileData.username ? profileData.username.substring(0,2).toUpperCase() : '??'}
                    </div>

                    <div className="flex-1 flex flex-col gap-3 md:gap-2 w-full">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={profileData.username} 
                              onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                              className="edit-input font-black uppercase text-base"
                            />
                          ) : (
                            <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight ${hasPremium ? 'premium-nick' : 'text-white'}`}>
                              {profileData.username || 'Загрузка...'}
                            </h2>
                          )}

                          {profileData.is_verified && (
                            <span className="bg-[#ff2a5f] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-[0_0_10px_rgba(255,42,95,0.4)] select-none">
                              VERIFIED
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <input 
                            type="text" 
                            value={profileData.handle} 
                            onChange={(e) => setProfileData(prev => ({ ...prev, handle: e.target.value }))}
                            className="edit-input text-xs text-gray-400 mt-1"
                          />
                        ) : (
                          <p className="text-xs md:text-sm text-gray-500 font-bold select-all">
                            @{profileData.handle || 'handle'}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-4 justify-center md:justify-start text-[11px] md:text-xs font-black uppercase tracking-wider text-gray-400 mt-1 select-none">
                        <div><span className="text-white font-black">{profileData.followers}</span> подписчиков</div>
                        <div><span className="text-white font-black">{profileData.following}</span> подписок</div>
                      </div>

                      <div className="hidden md:flex gap-2.5 mt-3 w-full">
                        <ActionButtons isMobile={false} />
                      </div>
                    </div>
                  </div>

                  <div className="flex md:hidden gap-2 w-full mt-1 relative z-10">
                    <ActionButtons isMobile={true} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 md:gap-3 border-t border-white/5 pt-4 md:pt-5 select-none relative z-10">
                    <div className="bg-white/[0.02] border border-white/5 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-center">
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Клавишник</div>
                      <div className="text-xs md:text-sm font-black text-white truncate">{profileData.clan}</div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-center">
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">В клубе с</div>
                      <div className="text-xs md:text-sm font-black text-white truncate">{profileData.memberSince}</div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-center">
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-0.5">Статус</div>
                      <div className="text-xs md:text-sm font-black text-[#ff2a5f] uppercase tracking-wider truncate">Active</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Публикация нового поста */}
              {(view === 'feed' || (view === 'profile' && isOwnProfile)) && (
                <div className="glass-card rounded-2xl md:rounded-[28px] p-3 md:p-4 flex flex-col gap-3 shadow-xl relative">
                  <div className="relative">
                    <textarea 
                      ref={postInputRef}
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder={view === 'feed' ? "Поделитесь чем-то новым в ленте..." : "Что у вас нового?"}
                      className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none h-20 md:h-24 p-1"
                      maxLength={500}
                    />
                    
                    {/* Панель эмодзи для поста */}
                    {showPostEmoji && (
                      <div className="absolute bottom-full right-0 mb-2 bg-[#121212] border border-white/10 rounded-xl p-2 grid grid-cols-7 gap-1 z-[50] shadow-2xl max-w-[240px]">
                        {EMOJI_LIST.map(emoji => (
                          <button key={emoji} onClick={() => addEmojiToPost(emoji)} className="hover:bg-white/10 p-1 rounded text-base transition-all">{emoji}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-3">
                    <button 
                      onClick={() => setShowPostEmoji(!showPostEmoji)}
                      className={`text-gray-500 hover:text-white transition-all p-1.5 rounded-lg ${showPostEmoji ? 'text-white bg-white/5' : ''}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    <button 
                      onClick={handlePublish}
                      className="bg-white text-black px-5 h-9 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all shadow-lg shadow-white/5 active:scale-95"
                    >
                      Опубликовать
                    </button>
                  </div>
                </div>
              )}

              {/* Табы внутри профиля */}
              {view === 'profile' && (
                <div className="flex gap-2 border-b border-white/5 pb-1 select-none">
                  <button 
                    onClick={() => handleTabChange('posts')}
                    className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all relative ${activeTab === 'posts' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    Публикации
                    {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#ff2a5f] shadow-[0_0_8px_#ff2a5f]" />}
                  </button>
                  <button 
                    onClick={() => handleTabChange('reposts')}
                    className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all relative ${activeTab === 'reposts' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    Репосты
                    {activeTab === 'reposts' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#ff2a5f] shadow-[0_0_8px_#ff2a5f]" />}
                  </button>
                </div>
              )}

              {/* ЛЕНТА С ПОСТАМИ */}
              <div className="flex flex-col gap-4 md:gap-5">
                {posts.length > 0 ? (
                  posts.map(post => (
                    <div key={post.id} className="glass-card rounded-2xl md:rounded-[32px] p-4 md:p-5 flex flex-col gap-4 shadow-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => handleViewChange('profile', post.username)}
                        >
                          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(post.username)} flex items-center justify-center text-white text-xs font-black italic`}>
                            {post.username ? post.username.substring(0,2).toUpperCase() : '??'}
                          </div>
                          <div>
                            <div className="font-black uppercase text-xs md:text-sm tracking-tight text-white group-hover:text-[#ff2a5f] transition-all flex items-center gap-1.5">
                              <span>{post.username}</span>
                              {post.is_verified && <div className="w-1.5 h-1.5 bg-[#ff2a5f] rounded-full shadow-[0_0_6px_#ff2a5f]" />}
                            </div>
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mt-0.5">{post.created_at || 'Только что'}</div>
                          </div>
                        </div>

                        {(post.username === user.username || (activeTab === 'reposts' && isOwnProfile)) && (
                          <button onClick={() => handleDelete(post.id)} className="text-gray-700 hover:text-red-500 transition-all p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>

                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap select-text px-1">{post.content}</p>

                      <div className="flex gap-5 border-t border-b border-white/5 py-3 px-1 select-none">
                        <button onClick={() => handleLike(post.id)} className={`interact-btn ${post.likes?.includes(user.username) ? 'active' : ''}`}>
                          <svg fill={post.likes?.includes(user.username) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          <span>{post.likes?.length || 0}</span>
                        </button>

                        <button onClick={() => toggleComments(post.id)} className={`interact-btn ${activePostComments[post.id] ? 'active' : ''}`}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          <span>{post.comments_count || 0}</span>
                        </button>

                        <button onClick={() => handleRepost(post.id)} className={`interact-btn ${post.reposts?.includes(user.username) ? 'active' : ''}`}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                          <span>{post.reposts?.length || 0}</span>
                        </button>
                      </div>

                      {/* БЛОК КОММЕНТАРИЕВ */}
                      {activePostComments[post.id] && (
                        <div className="flex flex-col gap-3 mt-1 relative">
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 chat-scroll">
                            {activePostComments[post.id].length === 0 ? (
                              <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider py-2 pl-1">Комментариев пока нет</p>
                            ) : (
                              activePostComments[post.id].map((comment, idx) => (
                                <div key={idx} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex gap-3 items-start">
                                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${getAvatarGradient(comment.username)} flex items-center justify-center text-white text-[10px] font-black italic shrink-0`}>
                                    {comment.username ? comment.username.substring(0,2).toUpperCase() : '??'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-black uppercase text-[11px] tracking-tight text-white hover:text-[#ff2a5f] cursor-pointer" onClick={() => handleViewChange('profile', comment.username)}>{comment.username}</span>
                                      <span className="text-[9px] text-gray-600 font-bold">{comment.created_at || 'Только что'}</span>
                                    </div>
                                    <p className="text-gray-300 text-xs mt-1 leading-relaxed whitespace-pre-wrap select-text">{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="flex gap-2 items-center mt-2 border-t border-white/5 pt-3 relative">
                            <div className="relative flex-1">
                              <input 
                                ref={el => commentInputRefs.current[post.id] = el}
                                type="text" 
                                placeholder="Написать комментарий..." 
                                className="comment-input pr-10"
                                value={commentInputs[post.id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                              />
                              
                              <button 
                                onClick={() => setShowCommentEmoji(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all ${showCommentEmoji[post.id] ? 'text-white' : ''}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>

                              {/* Панель эмодзи для конкретного комментария */}
                              {showCommentEmoji[post.id] && (
                                <div className="absolute bottom-full right-0 mb-2 bg-[#121212] border border-white/10 rounded-xl p-2 grid grid-cols-7 gap-1 z-[50] shadow-2xl max-w-[240px]">
                                  {EMOJI_LIST.map(emoji => (
                                    <button key={emoji} onClick={() => addEmojiToComment(post.id, emoji)} className="hover:bg-white/10 p-1 rounded text-sm transition-all">{emoji}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button onClick={() => handleSendComment(post.id)} className="bg-white text-black h-10 px-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95">OK</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  view === 'profile' && (
                    <div className="glass-card rounded-2xl md:rounded-[28px] p-8 text-center border-dashed border-white/5 select-none">
                      <p className="text-gray-600 font-black uppercase text-[11px] tracking-[0.2em]">
                        {activeTab === 'posts' 
                          ? (isOwnProfile ? 'Вы еще не опубликовали ни одной записи' : 'Пользователь еще не опубликовал записи')
                          : (isOwnProfile ? 'Вы еще не сделали ни одного репоста' : 'Пользователь еще не сделал ни одного репоста')
                        }
                      </p>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;