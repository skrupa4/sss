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

  const [view, setView] = useState('profile'); // 'profile' | 'feed' | 'messages'
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
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [view, activeChat, loadChats, loadMessages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    const textToSend = messageInput;
    setMessageInput('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        担当: 'POST',
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
        loadChats();
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
      } else {
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
           
        /* Фирменный киберпанк ромбик */
        .cyber-rhombus { width: 32px; height: 32px; background: transparent; border: 3px solid #ff2a5f; transform: rotate(45deg); animation: pulse-rhombus 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; filter: drop-shadow(0 0 10px #ff2a5f); }
        @keyframes pulse-rhombus { 0% { transform: rotate(45deg) scale(0.8); opacity: 0.5; } 50% { transform: rotate(225deg) scale(1.2); opacity: 1; border-color: #7e22ce; filter: drop-shadow(0 0 15px #7e22ce); } 100% { transform: rotate(405deg) scale(0.8); opacity: 0.5; border-color: #ff2a5f; filter: drop-shadow(0 0 10px #ff2a5f); } }

        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 99px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 42, 95, 0.3); }
      `}</style>

      {/* ЭКРАН ЗАГРУЗКИ С РОМБИКОМ */}
      {shouldRenderLoader && (
        <div className={`fixed inset-0 bg-[#080808] z-[9999] flex flex-col gap-6 items-center justify-center fade-loader ${!isLoading ? 'hidden' : ''}`}>
          <div className="cyber-rhombus"></div>
          <div className="text-gray-500 font-black uppercase text-[10px] tracking-[0.25em] sss-logo">Загрузка данных...</div>
        </div>
      )}

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-6 justify-center">
           
        {/* Сайдбар */}
        <aside className="fixed bottom-0 left-0 w-full lg:w-[240px] lg:static flex flex-row lg:flex-col justify-between lg:justify-start gap-5 glass-card p-3 sm:p-4 lg:p-5 rounded-t-[24px] lg:rounded-[28px] h-fit lg:sticky lg:top-8 shadow-2xl z-[999] border-t border-white/10 lg:border-none">
          <div className="hidden lg:flex justify-center py-4 cursor-pointer" onClick={() => handleViewChange('feed')}>
            <span className="sss-logo text-4xl font-black italic tracking-tighter select-none">SSS</span>
          </div>
          <nav className="flex flex-row lg:flex-col gap-1 w-full lg:w-auto justify-around lg:justify-start">
            <div onClick={() => handleViewChange('feed')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'feed' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'feed' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Лента</span>
            </div>

            <div onClick={() => handleViewChange('messages')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'messages' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'messages' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Чаты</span>
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
           
          {/* ОКНО ЧАТОВ */}
          {view === 'messages' && (
            <div className="glass-card rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border-white/10 flex h-[75vh] md:h-[80vh] w-full">
               
              {/* Список Чатов */}
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

              {/* Окно диалога */}
              <div className={`flex-1 flex flex-col bg-black/20 ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                {activeChat ? (
                  <>
                    <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center gap-3 h-[60px] flex-shrink-0">
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

          {/* КОНТЕНТ ПРОФИЛЯ / СТЕНА */}
          {view === 'profile' && (
            <div className="glass-card rounded-2xl md:rounded-[36px] overflow-hidden shadow-2xl border-white/10">
              <div className="h-28 md:h-40 bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#080808]"></div>
              <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end -mt-10 md:-mt-12 mb-6 gap-4">
                  <div className="relative group">
                    <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl md:rounded-[28px] bg-gradient-to-br ${getAvatarGradient(profileData.username)} border-[4px] md:border-[5px] border-[#080808] flex items-center justify-center text-white font-black text-3xl md:text-4xl uppercase select-none shadow-2xl`}>
                      {profileData.username ? profileData.username.charAt(0) : '?'}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto items-center">
                    <ActionButtons isMobile={false} />
                  </div>
                </div>

                {/* Инфо профиля */}
                <div className="text-center md:text-left space-y-1 mb-6">
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    <h2 className={`text-xl md:text-2xl font-black uppercase italic tracking-tight ${hasPremium ? 'premium-nick' : 'text-white'}`}>
                      {profileData.username || 'Загрузка...'}
                    </h2>
                    {profileData.clan && (
                      <span className="bg-[#ff2a5f]/10 text-[#ff2a5f] border border-[#ff2a5f]/20 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">
                        {profileData.clan}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">@{profileData.handle || 'handle'}</p>
                </div>

                {/* Вкладки Стены */}
                <div className="flex gap-4 border-b border-white/5 pb-3 mb-6">
                  <button onClick={() => handleTabChange('posts')} className={`text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'posts' ? 'text-white border-b-2 border-[#ff2a5f] pb-3 -mb-3.5' : 'text-gray-500 hover:text-white'}`}>Посты</button>
                  <button onClick={() => handleTabChange('reposts')} className={`text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'reposts' ? 'text-white border-b-2 border-[#ff2a5f] pb-3 -mb-3.5' : 'text-gray-500 hover:text-white'}`}>Репосты</button>
                </div>

                {/* Вывод постов / репостов */}
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 font-black text-xs uppercase tracking-widest bg-white/[0.01] rounded-2xl border border-white/[0.03]">
                      {activeTab === 'posts' 
                        ? 'Вы еще не опубликовали ни одного поста' 
                        : 'Вы еще не сделали ни одного репоста'}
                    </div>
                  ) : (
                    posts.map(post => (
                      <div key={post.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(post.username)} flex items-center justify-center text-white font-black text-xs uppercase`}>
                            {post.username?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white uppercase tracking-tight">{post.username}</h4>
                            <span className="text-[9px] text-gray-600 font-medium">{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Недавно'}</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-300 whitespace-pre-wrap">{post.content}</p>
                        
                        <div className="flex gap-4 pt-2 border-t border-white/5">
                          <button onClick={() => handleLike(post.id)} className="interact-btn text-xs font-bold uppercase">❤️ {post.likes?.length || 0}</button>
                          <button onClick={() => toggleComments(post.id)} className="interact-btn text-xs font-bold uppercase">💬 {post.comments_count || 0}</button>
                          <button onClick={() => handleRepost(post.id)} className="interact-btn text-xs font-bold uppercase">🔁 {post.reposts?.length || 0}</button>
                          {isOwnProfile && <button onClick={() => handleDelete(post.id)} className="text-xs font-bold uppercase text-red-500/60 hover:text-red-500 ml-auto">Удалить</button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ProfilePage;