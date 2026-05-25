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

  // СОСТОЯНИЯ ДЛЯ ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ
  const [postToDelete, setPostToDelete] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null); // { postId, commentId }

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
        console.error("Ошибка保存:", err);
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

  // ФУНКЦИЯ ДЛЯ УДАЛЕНИЯ КОММЕНТАРИЯ
  const handleDeleteComment = async (postId, commentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username })
      });

      if (response.ok) {
        setActivePostComments(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p));
      }
    } catch (err) { console.error("Ошибка удаления комментария:", err); }
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
        .achievement-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; }
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

      {/* МОДАЛЬНОЕ ОКНО: ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ПОСТА */}
      {postToDelete !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="glass-card rounded-[24px] max-w-[400px] w-full p-6 border border-white/10 text-center shadow-2xl">
            <h3 className="text-[16px] font-black uppercase text-white tracking-wider mb-2">Удаление записи</h3>
            <p className="text-[13px] text-gray-400 mb-6">Вы уверены, что хотите удалить запись?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPostToDelete(null)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 text-[11px] font-black uppercase hover:bg-white/10 transition-all text-white"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  handleDelete(postToDelete);
                  setPostToDelete(null);
                }}
                className="flex-1 bg-[#ff2a5f] rounded-xl py-3 text-[11px] font-black uppercase hover:bg-[#ff2a5f]/80 transition-all text-white shadow-lg shadow-[#ff2a5f]/20"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ КОММЕНТАРИЯ */}
      {commentToDelete !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="glass-card rounded-[24px] max-w-[400px] w-full p-6 border border-white/10 text-center shadow-2xl">
            <h3 className="text-[16px] font-black uppercase text-white tracking-wider mb-2">Удаление комментария</h3>
            <p className="text-[13px] text-gray-400 mb-6">Вы уверены, что хотите удалить этот комментарий?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCommentToDelete(null)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 text-[11px] font-black uppercase hover:bg-white/10 transition-all text-white"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  handleDeleteComment(commentToDelete.postId, commentToDelete.commentId);
                  setCommentToDelete(null);
                }}
                className="flex-1 bg-[#ff2a5f] rounded-xl py-3 text-[11px] font-black uppercase hover:bg-[#ff2a5f]/80 transition-all text-white shadow-lg shadow-[#ff2a5f]/20"
              >
                Удалить
              </button>
            </div>
          </div>
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
          <div className="hidden lg:block mt-auto pt-4 border-t border-white/5">
            <button onClick={onLogout} className="w-full bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-400 py-3 rounded-xl text-[11px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-2">Выйти</button>
          </div>
        </aside>

        {/* Главный блок контента */}
        <main className={`flex-1 max-w-[680px] w-full animated-content ${animateContent ? 'visible' : ''} pb-16 lg:pb-0`}>
          
          {/* СООБЩЕНИЯ (ИНТЕРФЕЙС ЛС) */}
          {view === 'messages' && (
            <div className="glass-card rounded-[28px] border border-white/5 overflow-hidden flex flex-col h-[calc(100vh-120px)] lg:h-[750px] shadow-2xl">
              <div className="flex flex-1 overflow-hidden">
                
                {/* Список чатов */}
                <div className={`w-full md:w-[240px] border-r border-white/5 flex flex-col bg-black/20 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-white/5">
                    <h2 className="text-[14px] font-black uppercase tracking-wider text-gray-400">Диалоги</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chats.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 text-[11px] uppercase font-bold tracking-wider">Нет диалогов</div>
                    ) : (
                      chats.map((chat, idx) => {
                        const isChatActive = activeChat?.username === chat.username;
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              setActiveChat(chat);
                              loadMessages(chat.username);
                            }}
                            className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${isChatActive ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                          >
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(chat.username)} flex items-center justify-center font-black text-[12px] uppercase text-white shadow-md`}>
                              {chat.username.substring(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <span className="text-[13px] font-black truncate">{chat.username}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">{chat.lastMessage}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Окно чата */}
                <div className={`flex-1 flex flex-col bg-black/10 ${!activeChat ? 'hidden md:flex items-center justify-center p-8' : 'flex'}`}>
                  {activeChat ? (
                    <>
                      {/* Шапка чата */}
                      <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-black/20">
                        <button 
                          onClick={() => setActiveChat(null)}
                          className="md:hidden text-gray-400 hover:text-white mr-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(activeChat.username)} flex items-center justify-center font-black text-[12px] uppercase text-white shadow-md`}>
                          {activeChat.username.substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-[13px] font-black cursor-pointer hover:text-[#ff2a5f]" onClick={() => handleViewChange('profile', activeChat.username)}>
                            {activeChat.username}
                          </div>
                          <div className="text-[9px] text-gray-500 uppercase font-black tracking-wider">В сети</div>
                        </div>
                      </div>

                      {/* Сообщения */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                        {messages.map((msg, index) => {
                          const isMyMsg = msg.sender === user.username;
                          return (
                            <div 
                              key={index} 
                              className={`max-w-[75%] rounded-[20px] p-3.5 text-[13px] ${isMyMsg 
                                ? 'bg-gradient-to-br from-[#ff2a5f] to-[#7e22ce] text-white self-end rounded-tr-none shadow-lg shadow-[#ff2a5f]/10' 
                                : 'bg-white/5 text-gray-200 self-start rounded-tl-none border border-white/5'}`}
                            >
                              <p className="leading-relaxed break-words">{msg.content}</p>
                              <div className={`text-[9px] mt-1 text-right font-bold uppercase ${isMyMsg ? 'text-white/60' : 'text-gray-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Поле ввода */}
                      <div className="p-3 border-t border-white/5 bg-black/20 flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Напишите сообщение..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="comment-input h-11 bg-white/5 border border-white/5 rounded-xl px-4"
                        />
                        <button 
                          onClick={handleSendMessage}
                          className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95 shrink-0"
                        >
                          <svg className="w-4 h-4 transform rotate-90 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 select-none">
                      <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-600">Выберите диалог для начала общения</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* УВЕДОМЛЕНИЯ */}
          {view === 'notifications' && (
            <div className="glass-card rounded-[28px] p-6 text-center border border-white/5 min-h-[300px] flex flex-col items-center justify-center select-none">
              <svg className="w-10 h-10 text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-gray-600 font-black uppercase text-[11px] tracking-[0.2em]">Уведомлений пока нет</p>
            </div>
          )}

          {/* ЛЕНТА И ПРОФИЛЬ */}
          {view !== 'messages' && view !== 'notifications' && (
            <div className="space-y-6">
              
              {/* Шапка профиля */}
              {view === 'profile' && (
                <div className="glass-card rounded-[28px] p-5 md:p-7 relative overflow-hidden border border-white/5 shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-[80px] md:h-[110px] bg-gradient-to-r from-[#ff2a5f]/10 to-[#7e22ce]/10 border-b border-white/5"></div>
                  
                  <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-4 md:gap-6 mt-4 md:mt-8">
                    <div className={`w-20 h-20 md:w-28 md:h-28 rounded-[24px] md:rounded-[32px] bg-gradient-to-br ${getAvatarGradient(profileData.username)} flex items-center justify-center font-black text-2xl md:text-4xl text-white uppercase shadow-xl relative group shrink-0 border border-white/10`}>
                      {profileData.username ? profileData.username.substring(0,2) : '??'}
                      {hasPremium && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#ff2a5f] to-[#7e22ce] p-1 rounded-lg border border-black shadow-lg">
                          <svg className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div className="min-w-0">
                          {isEditing ? (
                            <input
                              type="text"
                              className="edit-input font-black text-lg md:text-xl"
                              value={profileData.username}
                              onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                            />
                          ) : (
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white truncate flex items-center justify-center sm:justify-start gap-2">
                              <span className={hasPremium ? "premium-nick" : ""}>{profileData.username}</span>
                            </h1>
                          )}
                          
                          {isEditing ? (
                            <input
                              type="text"
                              className="edit-input mt-1 text-xs text-gray-400"
                              value={profileData.handle}
                              onChange={(e) => setProfileData({ ...profileData, handle: e.target.value })}
                            />
                          ) : (
                            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mt-0.5 truncate">@{profileData.handle || profileData.username}</p>
                          )}
                        </div>

                        {/* Кнопки десктоп */}
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          <ActionButtons isMobile={false} />
                        </div>
                      </div>

                      {/* Статистика */}
                      <div className="flex justify-center sm:justify-start gap-6 mt-4 border-t border-white/5 pt-3">
                        <div>
                          <span className="text-[14px] font-black text-white">{profileData.followers}</span>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1.5">подписчики</span>
                        </div>
                        <div>
                          <span className="text-[14px] font-black text-white">{profileData.following}</span>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1.5">подписки</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Кнопки мобилка */}
                  <div className="flex sm:hidden items-center gap-1.5 mt-5 pt-4 border-t border-white/5 w-full">
                    <ActionButtons isMobile={true} />
                  </div>
                </div>
              )}

              {/* Создание нового поста */}
              {(view === 'feed' || isOwnProfile) && (
                <div className="glass-card rounded-[24px] p-4 md:p-5 border border-white/5 shadow-xl relative">
                  <div className="flex gap-4">
                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(user.username)} flex items-center justify-center font-black text-xs md:text-sm text-white uppercase shadow-md shrink-0`}>
                      {user.username.substring(0, 2)}
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        ref={postInputRef}
                        rows="3"
                        placeholder="Что нового, босс? Напишите об этом..."
                        value={postText}
                        onChange={(e) => setPostText(e.target.value)}
                        className="w-full bg-transparent text-white placeholder-gray-600 text-[14px] font-medium resize-none outline-none pt-1 md:pt-2"
                      ></textarea>
                      
                      {/* Панель эмодзи */}
                      {showPostEmoji && (
                        <div className="absolute left-0 bottom-12 z-[100] glass-card border border-white/10 rounded-xl p-3 max-w-[280px] sm:max-w-[340px] shadow-2xl">
                          <div className="grid grid-cols-7 gap-1.5 max-h-[140px] overflow-y-auto">
                            {EMOJI_LIST.map((emoji, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => addEmojiToPost(emoji)}
                                className="text-[18px] p-1 rounded-md hover:bg-white/10 transition-all active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setShowPostEmoji(!showPostEmoji)}
                            className={`p-2 rounded-xl text-gray-500 hover:text-white transition-all ${showPostEmoji ? 'bg-white/5 text-white' : ''}`}
                            title="Добавить эмодзи"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button className="p-2 rounded-xl text-gray-500 hover:text-white transition-all" title="Загрузить медиа">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={handlePublish}
                          disabled={!postText.trim()}
                          className="bg-white text-black disabled:bg-white/10 disabled:text-gray-600 px-5 h-9 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-gray-200 transition-all duration-300 active:scale-95"
                        >
                          Опубликовать
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Переключатель вкладок внутри профиля */}
              {view === 'profile' && (
                <div className="flex border-b border-white/5 gap-6">
                  <button
                    onClick={() => handleTabChange('posts')}
                    className={`pb-3 text-[11px] font-black uppercase tracking-wider relative transition-all ${activeTab === 'posts' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    Записи
                    {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#ff2a5f] rounded-full" />}
                  </button>
                  <button
                    onClick={() => handleTabChange('reposts')}
                    className={`pb-3 text-[11px] font-black uppercase tracking-wider relative transition-all ${activeTab === 'reposts' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    Репосты
                    {activeTab === 'reposts' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#ff2a5f] rounded-full" />}
                  </button>
                </div>
              )}

              {/* Вывод постов */}
              <div className="space-y-4">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post.id} className="glass-card rounded-[24px] p-4 md:p-5 border border-white/5 relative shadow-lg group">
                      
                      {/* Метка репоста */}
                      {post.is_repost && (
                        <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-wider mb-3 pb-2 border-b border-white/5">
                          <svg className="w-3.5 h-3.5 text-[#ff2a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                          </svg>
                          <span>Репост от @{post.reposted_by}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center cursor-pointer" onClick={() => handleViewChange('profile', post.username)}>
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(post.username)} flex items-center justify-center font-black text-xs md:text-sm uppercase text-white shadow-md`}>
                            {post.username.substring(0, 2)}
                          </div>
                          <div>
                            <h4 className="text-[13px] md:text-[14px] font-black text-white hover:text-[#ff2a5f] transition-all flex items-center gap-1.5">
                              <span>{post.username}</span>
                            </h4>
                            <span className="text-[9px] text-gray-600 uppercase font-black tracking-wider block mt-0.5">
                              {new Date(post.created_at).toLocaleDateString()} в {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>

                        {/* Кнопка удаления поста с вызовом модалки подтверждения */}
                        {((isOwnProfile && activeTab === 'posts' && !post.is_repost) || 
                          (isOwnProfile && activeTab === 'reposts' && post.is_repost) || 
                          post.username === user.username) && (
                          <button
                            onClick={() => setPostToDelete(post.id)}
                            className="text-gray-700 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100"
                            title="Удалить запись"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Текст поста */}
                      <p className="text-[14px] text-gray-200 mt-3 whitespace-pre-wrap leading-relaxed select-text">{post.content}</p>

                      {/* Кнопки взаимодействия */}
                      <div className="flex gap-5 mt-4 pt-3 border-t border-white/5">
                        <button onClick={() => handleLike(post.id)} className={`interact-btn ${post.is_liked ? 'active' : ''}`}>
                          <svg fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{post.likes_count || 0}</span>
                        </button>

                        <button onClick={() => toggleComments(post.id)} className={`interact-btn ${activePostComments[post.id] ? 'active' : ''}`}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{post.comments_count || 0}</span>
                        </button>

                        {!post.is_repost && (
                          <button onClick={() => handleRepost(post.id)} className="interact-btn text-gray-500 hover:text-white">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span>{post.reposts_count || 0}</span>
                          </button>
                        )}
                      </div>

                      {/* Блок комментариев */}
                      {activePostComments[post.id] && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3 relative">
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {(activePostComments[post.id] || []).map((comment) => (
                              <div key={comment.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl flex flex-col relative group/comment">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-[#ff2a5f] uppercase">{comment.username}</span>
                                    <span className="text-[9px] text-gray-600 uppercase font-bold">
                                      {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                  
                                  {/* КРЕСТИК ДЛЯ УДАЛЕНИЯ КОММЕНТАРИЯ С МОДАЛКОЙ */}
                                  {(comment.username === user.username || post.username === user.username) && (
                                    <button
                                      onClick={() => setCommentToDelete({ postId: post.id, commentId: comment.id })}
                                      className="text-gray-700 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover/comment:opacity-100"
                                      title="Удалить комментарий"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <p className="text-[13px] text-gray-300 leading-normal select-text">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                          
                          {/* Панель эмодзи для комментариев */}
                          {showCommentEmoji[post.id] && (
                            <div className="absolute left-0 bottom-14 z-[100] glass-card border border-white/10 rounded-xl p-2.5 max-w-[260px] shadow-2xl">
                              <div className="grid grid-cols-7 gap-1 max-h-[100px] overflow-y-auto">
                                {EMOJI_LIST.map((emoji, idx) => (
                                  <button 
                                    key={idx} 
                                    onClick={() => addEmojiToComment(post.id, emoji)}
                                    className="text-[16px] p-0.5 rounded hover:bg-white/10 transition-all"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Форма отправки комментария */}
                          <div className="flex gap-2 items-center relative">
                            <button 
                              onClick={() => setShowCommentEmoji(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className={`p-2 rounded-xl text-gray-500 hover:text-white transition-all shrink-0 ${showCommentEmoji[post.id] ? 'bg-white/5 text-white' : ''}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>

                            <input
                              ref={el => commentInputRefs.current[post.id] = el}
                              type="text"
                              placeholder="Написать... "
                              className="comment-input h-10"
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                            />
                            <button 
                              onClick={() => handleSendComment(post.id)} 
                              className="bg-white text-black h-10 px-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95"
                            >
                              OK
                            </button>
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;