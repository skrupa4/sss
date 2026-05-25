import React, { useState, useEffect, useCallback, useRef } from 'react';

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

const ProfilePage = ({ user, onLogout, onUpdateUser }) => {
  const hasPremium = true;

  const [view, setView] = useState('profile'); // 'profile' | 'feed' | 'messages' | 'notifications'
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [activePostComments, setActivePostComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

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
    clan: 'SSS OWNER',
    isSubscribed: false
  });

  // СОСТОЯНИЯ ДЛЯ ЛИЧНЫХ СООБЩЕНИЙ
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // Содержит объект чата/собеседника
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
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Ошибка загрузки чатов:", err);
    }
  }, [user.username]);

  // Загрузка сообщений конкретного чата
  const loadMessages = useCallback(async (withUser) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/history?user1=${user.username}&user2=${withUser}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
    }
  }, [user.username]);

  // Интервал для обновления чата и сообщений
  useEffect(() => {
    if (view === 'messages') {
      loadChats();
      const interval = setInterval(() => {
        loadChats();
        if (activeChat) {
          loadMessages(activeChat.username);
        }
      }, 4000); // Полуллинг каждые 4 секунды
      return () => clearInterval(interval);
    }
  }, [view, activeChat, loadChats, loadMessages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    const textToSend = messageInput;
    setMessageInput(''); // Оптимистично очищаем инпут

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: user.username,
          receiver: activeChat.username,
          content: textToSend
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        loadChats(); // Обновляем список чатов, чтобы поднять текущий наверх
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
            <span>
              {isEditing ? 'Сохранить' : 'Редактировать'}
            </span>
          </button>
        ) : (
          <>
            <button
              onClick={handleFollow}
              className={`btn-fixed flex-1 ${isMobile ? 'px-3 py-1.5 h-8 rounded-lg text-[9px]' : 'md:flex-none px-5 py-2.5 h-11 rounded-xl text-[10px]'} font-black uppercase transition-all cursor-pointer border ${profileData.isSubscribed ? 'bg-white/5 border-white/10 text-white' : 'bg-[#ff2a5f] border-[#ff2a5f] text-white shadow-lg shadow-[#ff2a5f]/20 hover:scale-105 active:scale-95'}`}>
              {profileData.isSubscribed ? 'Отписаться' : 'Подписаться'}
            </button>
            
            {/* КНОПКА ОТКРЫТИЯ ЛС ИЗ ПРОФИЛЯ */}
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

        /* =========================================================================
           ПОМЕТКА: ЭТОТ ДИЗАЙН ЗАГРУЗКИ (РОМБ) НЕЛЬЗЯ ТРОГАТЬ И МЕНЯТЬ В БУДУЩЕМ! 
           Сделано строго по концепту: крутящийся ромб, у которого светится и 
           меняется грань в процессе вращения.
           ========================================================================= */
        .glowing-rhombus {
          width: 48px;
          height: 48px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          transform: rotate(45deg);
          position: relative;
          animation: spin-rhombus 1.8s linear infinite;
        }
        .glowing-rhombus::after {
          content: '';
          position: absolute;
          top: -2px; left: -2px; right: -2px; bottom: -2px;
          border: 2px solid transparent;
          border-top: 3px solid #b347ff; /* Фиолетовое свечение одной грани */
          box-shadow: inset 0 8px 15px -4px rgba(179, 71, 255, 0.5), 0 -8px 20px -4px rgba(179, 71, 255, 0.8);
          border-radius: 1px;
        }
        @keyframes spin-rhombus {
          0% { transform: rotate(45deg); }
          100% { transform: rotate(405deg); }
        }
        /* ========================================================================= */

        /* Кастомный скроллбар для зоны сообщений */
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 99px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 42, 95, 0.3); }
      `}</style>

      {/* =========================================================================
          ПОМЕТКА: ЭТОТ БЛОК ЗАГРУЗКИ НЕЛЬЗЯ ТРОГАТЬ И МЕНЯТЬ В БУДУЩЕМ!
          ========================================================================= */}
      {shouldRenderLoader && (
        <div className={`fixed inset-0 bg-[#080808] z-[9999] flex flex-col gap-8 items-center justify-center fade-loader ${!isLoading ? 'hidden' : ''}`}>
          <div className="glowing-rhombus"></div>
          <div className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] mt-1">Загрузка...</div>
        </div>
      )}
      {/* ========================================================================= */}

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-6 justify-center">
         
        {/* Сайдбар */}
        <aside className="fixed bottom-0 left-0 w-full lg:w-[240px] lg:static flex flex-row lg:flex-col justify-between lg:justify-start gap-5 glass-card p-3 sm:p-4 lg:p-5 rounded-t-[24px] lg:rounded-[28px] h-fit lg:sticky lg:top-8 shadow-2xl z-[999] border-t border-white/10 lg:border-none">
          <div className="hidden lg:flex justify-center py-4 cursor-pointer" onClick={() => handleViewChange('feed')}>
            <span className="sss-logo text-4xl font-black italic tracking-tighter select-none">SSS</span>
          </div>
          <nav className="flex flex-row lg:flex-col gap-1 w-full lg:w-auto justify-around lg:justify-start">
            <div onClick={() => handleViewChange('feed')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'feed' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'feed' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012-2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Лента</span>
            </div>

            {/* ВКЛАДКА ЛС В СAЙДБАРЕ */}
            <div onClick={() => handleViewChange('messages')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'messages' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'messages' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Сообщения</span>
            </div>

            {/* ВКЛАДКА УВЕДОМЛЕНИЙ В САЙДБАРЕ */}
            <div onClick={() => handleViewChange('notifications')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'notifications' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'notifications' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Уведомления</span>
            </div>

            <div onClick={() => handleViewChange('profile', user.username)} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'profile' && isOwnProfile ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'profile' && isOwnProfile ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Профиль</span>
            </div>
            <div onClick={onLogout} className="flex lg:hidden items-center justify-center p-3 text-gray-500 hover:text-red-500 rounded-xl flex-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </div>
          </nav>

          <div onClick={onLogout} className="hidden lg:flex mt-16 border-t border-white/5 pt-5 text-gray-600 hover:text-red-500 cursor-pointer transition-all items-center gap-3 px-2 group">
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="text-[11px] font-black uppercase tracking-widest">Выход</span>
          </div>
        </aside>

        {/* Основной контент */}
        <main className={`flex-1 w-full max-w-[680px] flex flex-col gap-4 md:gap-5 animated-content ${animateContent ? 'visible' : ''}`}>
          
          {/* РЕНДЕР СТРАНИЦЫ ЛС */}
          {view === 'messages' && (
            <div className="glass-card rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border-white/10 flex h-[75vh] md:h-[80vh] w-full">
              
              {/* Левая колонка: Список Чатов */}
              <div className={`w-full md:w-2/5 border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h1 className="text-lg md:text-xl font-black uppercase italic sss-logo tracking-tight">Чаты</h1>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 chat-scroll">
                  {chats.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 font-bold text-xs uppercase tracking-wider">Чатов пока нет</div>
                  ) : (
                    chats.map(chat => (
                      <div
                        key={chat.username}
                        onClick={() => {
                          setActiveChat(chat);
                          loadMessages(chat.username);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeChat?.username === chat.username ? 'bg-white/5 border border-white/5' : 'hover:bg-white/[0.02] border border-transparent'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(chat.username)} flex items-center justify-center text-white font-black text-sm uppercase flex-shrink-0 shadow-md`}>
                          {chat.username.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="font-black text-xs uppercase tracking-tight text-white/90 truncate">{chat.username}</span>
                            {chat.last_message_time && (
                              <span className="text-[8px] text-gray-600 font-bold uppercase">{new Date(chat.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            )}
                          </div>
                          <p className="text-gray-500 font-medium text-xs truncate leading-tight">{chat.last_message || 'Нет сообщений'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Правая колонка: Окно Открытого Чата */}
              <div className={`flex-1 flex flex-col bg-black/20 ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                {activeChat ? (
                  <>
                    {/* Хедер чата */}
                    <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center gap-3 h-[60px] flex-shrink-0">
                      {/* Кнопка Назад для мобилки */}
                      <button onClick={() => setActiveChat(null)} className="md:hidden p-1.5 text-gray-400 hover:text-white mr-1 bg-white/5 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(activeChat.username)} flex items-center justify-center text-white font-black text-xs uppercase shadow-sm`}>
                        {activeChat.username.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h2 className="font-black text-xs uppercase tracking-wider text-white/90 cursor-pointer" onClick={() => handleViewChange('profile', activeChat.username)}>{activeChat.username}</h2>
                        <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Диалог</span>
                      </div>
                    </div>

                    {/* Сообщения */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll bg-[#0b0b0b]/40">
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender === user.username;
                        return (
                          <div key={msg.id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl border text-[13px] leading-relaxed shadow-lg ${isMe ? 'bg-gradient-to-br from-[#ff2a5f]/15 to-[#7e22ce]/5 border-[#ff2a5f]/20 rounded-br-none text-white' : 'bg-white/5 border-white/5 rounded-bl-none text-gray-200'}`}>
                              <p className="font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                              <div className="text-[8px] text-gray-600 font-bold uppercase mt-1 text-right tracking-tight select-none">
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Поле ввода */}
                    <div className="p-3 border-t border-white/5 bg-white/[0.01] flex gap-2 items-center flex-shrink-0">
                      <input
                        type="text"
                        placeholder="Написать сообщение..."
                        className="comment-input h-10 md:text-sm"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button onClick={handleSendMessage} className="bg-white text-black h-10 px-5 rounded-xl font-black text-[11px] uppercase hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center">Тык</button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 select-none opacity-40">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Выберите чат для общения</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* РЕНДЕР СТРАНИЦЫ УВЕДОМЛЕНИЙ */}
          {view === 'notifications' && (
            <div className="glass-card rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border-white/10 min-h-[50vh] flex flex-col">
              <div className="p-6 border-b border-white/5 text-center sm:text-left">
                <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase italic sss-logo">Уведомления</h1>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none opacity-60 gap-4">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <div className="space-y-1">
                  <p className="text-[13px] font-black uppercase tracking-widest text-white/90">Пока пусто</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider max-w-[250px] mx-auto">
                    Здесь будут уведомления после подключения БД и бэкенда
                  </p>
                </div>
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="glass-card rounded-2xl md:rounded-[36px] overflow-hidden shadow-2xl border-white/10">
              <div className="h-28 md:h-40 bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#080808]"></div>
              <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                
                {/* ТЕКСТОВАЯ АВАТАРКА С ГРАДИЕНТОМ ИЗ ИНИЦИАЛОВ */}
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end -mt-10 md:-mt-12 mb-6 gap-4">
                  <div className="relative group">
                    <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl md:rounded-[28px] bg-gradient-to-br ${getAvatarGradient(profileData.username)} border-[4px] md:border-[5px] border-[#080808] flex items-center justify-center text-white font-black text-3xl md:text-4xl uppercase select-none shadow-2xl`}>
                      {profileData.username ? profileData.username.charAt(0) : '?'}
                    </div>
                  </div>

                  <div className="hidden md:flex gap-2 w-full md:w-auto justify-center items-center">
                    <ActionButtons isMobile={false} />
                  </div>
                </div>

                {/* Инфо-зона профиля */}
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4">
                  <div className="space-y-2.5 w-full">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 max-w-full sm:max-w-[260px] mx-auto sm:mx-0">
                        <input className="edit-input font-black" value={profileData.username} onChange={(e) => setProfileData({...profileData, username: e.target.value})} placeholder="Имя" />
                        <input className="edit-input text-gray-400" value={profileData.handle} onChange={(e) => setProfileData({...profileData, handle: e.target.value})} placeholder="Хэндл" />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h1 className={`text-xl md:text-2xl font-black tracking-tighter ${hasPremium ? 'premium-nick' : ''}`}>{profileData.username}</h1>
                          <div className="w-4 h-4 bg-[#ff2a5f] rounded-full flex items-center justify-center text-[8px] text-white font-bold shadow-[0_0_10px_rgba(255,42,95,0.4)] flex-shrink-0">✓</div>
                        </div>
                        <p className="text-gray-500 font-bold text-xs md:text-sm">@{profileData.handle}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-center sm:justify-start gap-6 mt-3">
                      <p className="text-xs md:text-sm"><span className="font-black text-white">{profileData.followers}</span> <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider ml-1">Подписчики</span></p>
                      <p className="text-xs md:text-sm"><span className="font-black text-white">{profileData.following}</span> <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider ml-1">Подписки</span></p>
                    </div>
                    <div className="text-[9px] text-gray-600 font-black uppercase tracking-[0.15em] pt-1">
                      <p className="leading-relaxed">Регистрация: {profileData.memberSince} <br className="sm:hidden" /> • Клан: {profileData.clan}</p>
                    </div>
                  </div>

                  {/* Достижения */}
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex gap-2.5 h-fit justify-center">
                      <div className="achievement-card w-9 h-9 bg-yellow-500/20 rounded-xl flex items-center justify-center text-lg">🏆</div>
                      <div className="achievement-card w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center text-lg">🔥</div>
                  </div>
                </div>

                {/* Мобильные кнопки */}
                <div className="flex md:hidden gap-2 w-full mt-5 justify-center items-center">
                  <ActionButtons isMobile={true} />
                </div>

                {/* Вкладки Записи/Репосты */}
                <div className="flex mt-4 md:mt-6 p-1 bg-black/40 rounded-xl">
                  <div onClick={() => handleTabChange('posts')} className={`flex-1 py-2.5 text-center rounded-lg font-black text-[11px] cursor-pointer uppercase transition-all ${activeTab === 'posts' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>Записи</div>
                  <div onClick={() => handleTabChange('reposts')} className={`flex-1 py-2.5 text-center rounded-lg font-black text-[11px] cursor-pointer uppercase transition-all ${activeTab === 'reposts' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>Репосты</div>
                </div>
              </div>
            </div>
          )}

          {view === 'feed' && (
              <div className="px-2 mb-2"><h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic sss-logo text-center sm:text-left">Global Stream</h1></div>
          )}

          {/* Создание нового поста (Скрыто в режиме сообщений и уведомлений) */}
          {view !== 'messages' && view !== 'notifications' && (view === 'feed' || (isOwnProfile && activeTab === 'posts')) && (
            <div className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6 shadow-xl">
              <div className="flex gap-3 md:gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(user.username)} flex items-center justify-center text-white font-black text-lg uppercase select-none flex-shrink-0`}>
                  {user.username ? user.username.charAt(0) : '?'}
                </div>
                <textarea
                  placeholder="Что нового?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm md:text-[16px] py-1 resize-none h-16 placeholder:text-gray-800 text-white font-medium"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button onClick={handlePublish} className="w-full sm:w-auto bg-white text-black px-6 py-2.5 rounded-xl font-black text-[11px] uppercase hover:bg-gray-200 active:scale-95 transition-all">Опубликовать</button>
              </div>
            </div>
          )}

          {/* Лента Постов / Заглушки для пустых табов */}
          {view !== 'messages' && view !== 'notifications' && (
            <div className="flex flex-col gap-4 mb-16">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div key={post.id} className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6 transition-all group hover:border-white/10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div onClick={() => handleViewChange('profile', post.username)} className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(post.username)} flex items-center justify-center text-white font-black text-md uppercase select-none cursor-pointer hover:scale-105 transition-transform flex-shrink-0`}>
                          {post.username ? post.username.charAt(0) : '?'}
                        </div>
                        <div>
                          <p onClick={() => handleViewChange('profile', post.username)} className="font-black text-xs md:text-[13px] uppercase tracking-tight text-white/90 cursor-pointer hover:text-[#ff2a5f] transition-colors">{post.username}</p>
                          <p className="text-[9px] text-gray-600 font-black uppercase mt-0.5">{post.created_at ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                        </div>
                      </div>
                      {(post.username === user.username || (isOwnProfile && activeTab === 'reposts')) && (
                        <button onClick={() => handleDelete(post.id)} className="lg:opacity-0 lg:group-hover:opacity-100 p-2 text-gray-700 hover:text-red-500 transition-all cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                    <p className="pl-1 text-sm md:text-[15px] text-gray-300 leading-normal mb-5">{post.content}</p>
                    
                    {/* Кнопки взаимодействий */}
                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 pt-3 border-t border-white/5">
                      <button className={`interact-btn ${post.likes > 0 ? 'active' : ''}`} onClick={() => handleLike(post.id)}>
                        <svg fill={post.likes > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        <span>{post.likes || 0}</span>
                      </button>
                      <button className={`interact-btn ${activePostComments[post.id] ? 'active text-white' : ''}`} onClick={() => toggleComments(post.id)}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25-9 3.694-9 8.25c0 2.14.882 4.08 2.312 5.58.125.13.187.31.156.48l-.48 2.22c-.06.273.2.49.444.37l2.25-1.125c.15-.075.33-.075.48 0 1.05.525 2.22.825 3.45.825z" /></svg>
                        <span>{post.comments_count || 0}</span>
                      </button>
                      <button onClick={() => handleRepost(post.id)} className={`interact-btn ${post.reposts > 0 ? 'text-blue-400' : ''}`}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        <span>{post.reposts || 0}</span>
                      </button>
                    </div>

                    {/* Блок комментариев */}
                    {activePostComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
                          {activePostComments[post.id].map(comment => (
                            <div key={comment.id} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                              <div className="flex justify-between mb-1">
                                <span className="text-[11px] font-black text-[#ff2a5f] uppercase">{comment.username}</span>
                                <span className="text-[9px] text-gray-600 uppercase font-bold">{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <p className="text-[13px] text-gray-300">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Написать... "
                            className="comment-input"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                          />
                          <button onClick={() => handleSendComment(post.id)} className="bg-white text-black px-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200">OK</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* КИБЕРПАНК ТЕКСТЫ-ЗАГЛУШКИ ДЛЯ ПУСТЫХ ТАБОВ */
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
          )}
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;