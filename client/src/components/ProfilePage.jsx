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
    clan: 'SSS OWNER',
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
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Ошибка загрузки чатов:", err);
    }
  }, [user.username]);

  // Загрузка сообщения конкретного чата
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

  // Вставка эмодзи в текстовое поле поста с сохранением фокуса курсора
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

  // Вставка эмодзи в поле комментария конкретного поста
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
        .achievement-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; }
        .achievement-card:hover { transform: translateY(-5px) rotate(-8deg) scale(1.1); box-shadow: 0 10px 20px rgba(255, 42, 95, 0.2); }
        .interact-btn { display: flex; align-items: center; gap: 6px; color: #444; transition: all 0.2s; cursor: pointer; border: none; background: none; outline: none; }
        .interact-btn svg { width: 16px; height: 16px; stroke-width: 2.5; }
        .interact-btn:hover { color: #fff; }
        .interact-btn.active { color: #ff2a5f; }
        .interact-btn span { font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .comment-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 8px 12px; width: 100%; outline: none; color: white; font-size: 13px; }
        .btn-fixed { flex-shrink: 0 !important; white-space: nowrap !important; }

        /* ПЛАВНЫЕ КЛАССЫ ДЛЯ АНИМАЦИИ */
        .fade-loader { transition: opacity 0.30s ease-in-out, visibility 0.30s; opacity: 1; visibility: visible; }
        .fade-loader.hidden { opacity: 0; visibility: hidden; }
        
        .animated-content { opacity: 0; transform: translateY(10px); transition: opacity 0.4s cubic-bezier(0.215, 0.610, 0.355, 1), transform 0.4s cubic-bezier(0.215, 0.610, 0.355, 1); }
        .animated-content.visible { opacity: 1; transform: translateY(0); }
        
        /* Кастомный неоновый спиннер */
        .neon-spinner { width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.03); border-top-color: #ff2a5f; animation: spin 0.8s linear infinite; filter: drop-shadow(0 0 6px #ff2a5f); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* КРАСИВЫЙ ПЛАВНЫЙ ЭКРАН ЗАГРУЗКИ */}
      {shouldRenderLoader && (
        <div className={`fixed inset-0 bg-[#080808] z-[9999] flex flex-col gap-4 items-center justify-center fade-loader ${!isLoading ? 'hidden' : ''}`}>
          <div className="neon-spinner"></div>
          <div className="text-gray-500 font-black uppercase text-[10px] tracking-[0.25em] sss-logo">Загрузка данных...</div>
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

            <div onClick={() => handleViewChange('messages')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'messages' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'messages' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Сообщения</span>
            </div>

            <div onClick={() => handleViewChange('profile', user.username)} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'profile' && isOwnProfile ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'profile' && isOwnProfile ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Профиль</span>
            </div>
            
            <div onClick={onLogout} className="flex lg:hidden items-center justify-center p-3 text-gray-600 hover:text-red-500 cursor-pointer rounded-xl transition-all flex-1">
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
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeChat?.username === chat.username ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/[0.02]'}`}
                      >
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarGradient(chat.username)} flex items-center justify-center text-white font-black text-sm uppercase select-none flex-shrink-0 shadow-md`}>
                          {chat.username.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs md:text-[13px] text-white truncate">{chat.username}</span>
                            <span className="text-[8px] text-gray-600 font-bold uppercase shrink-0">{chat.last_time ? new Date(chat.last_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5 font-medium">{chat.last_message || 'Нет сообщений'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Правая колонка: Окно Диалога */}
              <div className={`flex-1 flex flex-col bg-[#0c0c0c]/20 ${!activeChat ? 'hidden md:flex items-center justify-center p-8' : 'flex'}`}>
                {activeChat ? (
                  <>
                    {/* Хедер чата */}
                    <div className="p-4 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#080808]/40">
                      <button onClick={() => setActiveChat(null)} className="md:hidden p-1 text-gray-500 hover:text-white mr-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarGradient(activeChat.username)} flex items-center justify-center text-white font-black text-sm uppercase select-none shadow-md`}>
                        {activeChat.username.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xs md:text-[13px] font-black uppercase tracking-wider text-white/90 cursor-pointer" onClick={() => handleViewChange('profile', activeChat.username)}>{activeChat.username}</h2>
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Выберите диалог из списка</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* КАРТОЧКА ПРОФИЛЯ */}
          {view === 'profile' && (
            <div className="glass-card rounded-[28px] md:rounded-[40px] p-5 md:p-8 relative overflow-hidden shadow-2xl">
              {/* Обложка (Баннер) */}
              <div className="absolute top-0 left-0 w-full h-24 md:h-32 bg-gradient-to-r from-white/[0.01] via-white/[0.03] to-transparent pointer-events-none border-b border-white/[0.03]"></div>
              
              {/* Кнопка ЛС (мобильная) и Аватар */}
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
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h1 className={`text-xl md:text-2xl font-black tracking-tighter ${hasPremium ? 'premium-nick' : ''}`}>{profileData.username}</h1>
                      {profileData.is_verified && (
                        <div className="w-4 h-4 bg-[#ff2a5f] rounded-full flex items-center justify-center text-[8px] text-white font-bold shadow-[0_0_10px_rgba(255,42,95,0.4)] flex-shrink-0" title="Верифицированный аккаунт">✓</div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-center sm:justify-start gap-6 mt-3">
                    <p className="text-xs md:text-sm"><span className="font-black text-white">{profileData.followers}</span> <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider ml-1">Подписчики</span></p>
                    <p className="text-xs md:text-sm"><span className="font-black text-white">{profileData.following}</span> <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider ml-1">Подписки</span></p>
                  </div>

                  <div className="text-[9px] text-gray-600 font-black uppercase tracking-[0.15em] pt-1">
                    <p className="leading-relaxed">Регистрация: {profileData.memberSince}</p>
                    <p className="text-[#ff2a5f] font-black mt-0.5 tracking-[0.2em]">{profileData.clan}</p>
                  </div>
                </div>
              </div>

              {/* Кнопки действий (мобильные) */}
              <div className="flex md:hidden gap-1.5 w-full mt-5">
                <ActionButtons isMobile={true} />
              </div>
            </div>
          )}

          {/* ТАБЫ ПРОФИЛЯ */}
          {view === 'profile' && (
            <div className="flex gap-2 border-b border-white/5 pb-1 select-none">
              <button onClick={() => handleTabChange('posts')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'posts' ? 'text-white' : 'text-gray-600 hover:text-white'}`}>
                Записи
                {activeTab === 'posts' && <div className="absolute bottom-[-5px] left-0 w-full h-[2px] bg-[#ff2a5f]"></div>}
              </button>
              <button onClick={() => handleTabChange('reposts')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'reposts' ? 'text-white' : 'text-gray-600 hover:text-white'}`}>
                Репосты
                {activeTab === 'reposts' && <div className="absolute bottom-[-5px] left-0 w-full h-[2px] bg-[#ff2a5f]"></div>}
              </button>
            </div>
          )}

          {/* ОКНО СОЗДАНИЯ ПОСТА */}
          {(view === 'feed' || (view === 'profile' && isOwnProfile && activeTab === 'posts')) && (
            <div className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-5 shadow-xl border-white/5">
              <div className="flex gap-3 items-start">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(user.username)} flex items-center justify-center text-white font-black text-lg uppercase select-none flex-shrink-0`}>
                  {user.username ? user.username.charAt(0) : '?'}
                </div>
                <textarea
                  ref={postInputRef}
                  placeholder="Что нового?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm md:text-[16px] py-1 resize-none h-16 placeholder:text-gray-800 text-white font-medium"
                />
              </div>

              {/* ЗОНА ДЛЯ ЭМОДЗИ ПОСТА */}
              {showPostEmoji && (
                <div className="emoji-bar mt-3 p-2.5 rounded-xl flex flex-wrap gap-2 max-h-24 overflow-y-auto chat-scroll animate-fadeIn">
                  {EMOJI_LIST.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => addEmojiToPost(emoji)}
                      className="emoji-item text-lg md:text-xl p-0.5 outline-none select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mt-3">
                {/* Кнопка триггера эмодзи */}
                <button
                  onClick={() => setShowPostEmoji(!showPostEmoji)}
                  className={`p-2 rounded-xl transition-all border ${showPostEmoji ? 'bg-[#ff2a5f]/10 border-[#ff2a5f]/30 text-[#ff2a5f]' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                  title="Выбрать эмодзи"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button onClick={handlePublish} className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-[11px] uppercase hover:bg-gray-200 active:scale-95 transition-all">Опубликовать</button>
              </div>
            </div>
          )}

          {/* Лента Постов */}
          {view !== 'messages' && view !== 'notifications' && (
            <div className="flex flex-col gap-4 mb-16">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div key={post.id} className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6 transition-all group hover:border-white/10 shadow-lg relative">
                    
                    {/* Логика отображения плашки репоста */}
                    {post.is_repost && (
                      <div className="flex items-center gap-1.5 text-gray-600 font-black uppercase text-[8px] tracking-widest mb-3 select-none pb-2 border-b border-white/[0.02]">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" /></svg>
                        <span>Репостнул {post.reposted_by === user.username ? 'Вы' : post.reposted_by}</span>
                      </div>
                    )}

                    {/* Верхняя часть поста (Аватар + Ник) */}
                    <div className="flex justify-between items-start mb-3.5">
                      <div className="flex gap-3 items-center">
                        <div
                          onClick={() => handleViewChange('profile', post.username)}
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarGradient(post.username)} flex items-center justify-center text-white font-black text-sm uppercase select-none cursor-pointer shadow-md`}
                        >
                          {post.username ? post.username.charAt(0) : '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p 
                              onClick={() => handleViewChange('profile', post.username)} 
                              className={`font-black text-xs md:text-[13px] uppercase tracking-tight cursor-pointer flex-shrink-0 ${
                                (post.hasPremium || (post.username === user.username && hasPremium)) 
                                  ? 'premium-nick' 
                                  : 'text-white/90 hover:text-[#ff2a5f] transition-colors'
                              }`}
                            >
                              {post.username}
                            </p>
                            {post.is_verified && (
                              <div className="w-3.5 h-3.5 bg-[#ff2a5f] rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-[0_0_8px_rgba(255,42,95,0.4)] flex-shrink-0" title="Верифицированный аккаунт">✓</div>
                            )}
                          </div>
                          <p className="text-[9px] text-gray-600 font-black uppercase mt-0.5">{post.created_at ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                        </div>
                      </div>

                      {/* Кнопка удаления */}
                      {(post.username === user.username || (post.is_repost && post.reposted_by === user.username)) && (
                        <button onClick={() => handleDelete(post.id)} className="text-gray-700 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>

                    {/* Текст поста */}
                    <p className="text-gray-200 text-sm md:text-[15px] leading-relaxed font-medium whitespace-pre-wrap break-words mb-4 select-text">{post.content}</p>

                    {/* Кнопки взаимодействия */}
                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 pt-3 border-t border-white/5">
                      <button className={`interact-btn ${post.likes > 0 ? 'active' : ''}`} onClick={() => handleLike(post.id)}>
                        <svg fill={post.likes > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        <span>{post.likes || 0}</span>
                      </button>
                      <button className={`interact-btn ${activePostComments[post.id] ? 'active text-white' : ''}`} onClick={() => toggleComments(post.id)}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.381-.267.833-.355 1.272-.323a9.459 9.459 0 001.283.06z" /></svg>
                        <span>{post.comments_count || 0}</span>
                      </button>
                      <button className="interact-btn hover:text-green-500" onClick={() => handleRepost(post.id)}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3M3 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M3 12l3 3m-3-3l-3 3" /></svg>
                        <span>{post.reposts || 0}</span>
                      </button>
                    </div>

                    {/* Комментарии */}
                    {activePostComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-fadeIn">
                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 chat-scroll">
                          {activePostComments[post.id].length === 0 ? (
                            <p className="text-[10px] text-gray-700 font-black uppercase tracking-wider pl-1 py-1">Комментариев пока нет</p>
                          ) : (
                            activePostComments[post.id].map((comment, cIdx) => (
                              <div key={comment.id || cIdx} className="flex gap-2.5 items-start text-xs bg-white/[0.01] p-2 rounded-xl border border-white/[0.02]">
                                <div className={`w-6 h-6 rounded bg-gradient-to-br ${getAvatarGradient(comment.username)} flex items-center justify-center text-white font-black text-[10px] uppercase select-none flex-shrink-0 mt-0.5`}>
                                  {comment.username ? comment.username.charAt(0) : '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="font-black text-white uppercase text-[10px] tracking-tight cursor-pointer hover:text-[#ff2a5f]" onClick={() => handleViewChange('profile', comment.username)}>{comment.username}</span>
                                    <span className="text-[8px] text-gray-700 font-bold">{comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}</span>
                                  </div>
                                  <p className="text-gray-300 leading-relaxed break-words font-medium text-[12px]">{comment.content}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* ТРИГГЕР И КНОПКА ЭМОДЗИ КОММЕНТАРИЯ */}
                        {showCommentEmoji[post.id] && (
                          <div className="emoji-bar p-2 rounded-xl flex flex-wrap gap-1.5 max-h-20 overflow-y-auto chat-scroll mb-2 animate-fadeIn bg-black/20">
                            {EMOJI_LIST.map((emoji, i) => (
                              <button
                                key={i}
                                onClick={() => addEmojiToComment(post.id, emoji)}
                                className="emoji-item text-base p-0.5 outline-none select-none"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Форма отправки комментария */}
                        <div className="flex gap-2 items-center relative">
                          <button
                            onClick={() => setShowCommentEmoji(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className={`p-2 h-10 rounded-xl transition-all border ${showCommentEmoji[post.id] ? 'bg-[#ff2a5f]/10 border-[#ff2a5f]/30 text-[#ff2a5f]' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                            title="Добавить эмодзи"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <input
                            ref={el => commentInputRefs.current[post.id] = el}
                            type="text"
                            placeholder="Ваш комментарий..."
                            className="comment-input h-10 text-xs md:text-sm"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                          />
                          <button onClick={() => handleSendComment(post.id)} className="bg-white text-black h-10 px-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 flex items-center justify-center">OK</button>
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
          )}
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;