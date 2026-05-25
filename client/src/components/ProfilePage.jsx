import React, { useState, useEffect, useCallback } from 'react';

// Твой рабочий бэкенд на Render
const API_BASE_URL = 'https://sss-backend-haev.onrender.com';

const ProfilePage = ({ user, onLogout, onUpdateUser }) => {
  const hasPremium = true;
  const EMOJI_LIST = ['🤩', '😎', '🐱‍💻', '🔥', '💎', '👻', '👾', '👑', '🌌', '⚡'];

  const [view, setView] = useState('profile'); 
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); 
  const [isEditing, setIsEditing] = useState(false);
  const [activePostComments, setActivePostComments] = useState({}); 
  const [commentInputs, setCommentInputs] = useState({});
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [currentProfile, setCurrentProfile] = useState(user.username);
  const isOwnProfile = currentProfile === user.username;

  // Добавляем флаг загрузки, чтобы управлять экраном ожидания
  const [isLoading, setIsLoading] = useState(true);

  const [profileData, setProfileData] = useState({
    username: '',
    handle: '',
    followers: 0,
    following: 0,
    memberSince: 'Май 2026',
    clan: 'SSS OWNER',
    isSubscribed: false,
    avatar_emoji: '🤩'
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true); // Включаем загрузку перед запросами

      const userRes = await fetch(`${API_BASE_URL}/api/users/${currentProfile}?viewer=${user.username}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setProfileData(prev => ({ ...prev, ...userData }));
      } else {
        // Если база пустая и юзер не найден, подставляем дефолт, чтобы страница не висла
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
    } catch (err) {
      console.error("Ошибка загрузки данных с бэкенда:", err);
      setPosts([]);
      // На случай пустой БД даем дефолтное имя, чтобы рендер пошел дальше
      setProfileData(prev => ({ ...prev, username: currentProfile, handle: currentProfile }));
    } finally {
      setIsLoading(false); // ЖЕЛЕЗОБЕТОННО ВЫКЛЮЧАЕТ ЗАГРУЗКУ ПРИ ЛЮБОМ РАСКЛАДЕ
    }
  }, [currentProfile, view, activeTab, user.username]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            handle: profileData.handle,
            avatar_emoji: profileData.avatar_emoji
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

  const handleEmojiSelect = async (emoji) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_emoji: emoji }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setProfileData(prev => ({ ...prev, avatar_emoji: updated.avatar_emoji }));
        setIsEmojiPickerOpen(false);
        if (onUpdateUser) onUpdateUser(updated);
      }
    } catch (err) {
      console.error("Ошибка смены эмодзи:", err);
    }
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

  const goToProfile = (username) => {
    setCurrentProfile(username);
    setView('profile');
    setActiveTab('posts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && view === 'profile') {
    return <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500 font-black uppercase text-xs tracking-widest">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex justify-center items-start pt-4 md:pt-8 px-3 md:px-6 pb-24 lg:pb-8 antialiased"
         style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      <style>{`
        @keyframes flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .premium-nick { background: linear-gradient(90deg, #ff2a5f, #7e22ce, #ff2a5f); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: flow 3s linear infinite; }
        .glass-card { background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.04); }
        .sss-logo { background: linear-gradient(135deg, #fff 0%, #ff2a5f 50%, #7e22ce 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 8px rgba(255, 42, 95, 0.4)); }
        .edit-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px 10px; outline: none; width: 100%; color: white; font-size: 14px; }
        .achievement-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; }
        .achievement-card:hover { transform: translateY(-5px) rotate(-8deg) scale(1.1); box-shadow: 0 10px 20px rgba(255, 42, 95, 0.2); }
        .interact-btn { display: flex; align-items: center; gap: 6px; color: #444; transition: all 0.2s; cursor: pointer; border: none; background: none; outline: none; }
        .interact-btn svg { width: 16px; height: 16px; stroke-width: 2.5; }
        .interact-btn:hover { color: #fff; }
        .interact-btn.active { color: #ff2a5f; }
        .interact-btn span { font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .comment-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 8px 12px; width: 100%; outline: none; color: white; font-size: 13px; }
      `}</style>

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-6 justify-center">
        
        {/* Адаптивный Сайдбар: снизу на мобилках, слева на десктопе */}
        <aside className="fixed bottom-0 left-0 w-full lg:w-[240px] lg:static flex flex-row lg:flex-col justify-between lg:justify-start gap-5 glass-card p-3 sm:p-4 lg:p-5 rounded-t-[24px] lg:rounded-[28px] h-fit lg:sticky lg:top-8 shadow-2xl z-[999] border-t border-white/10 lg:border-none">
          <div className="hidden lg:flex justify-center py-4 cursor-pointer" onClick={() => setView('feed')}>
            <span className="sss-logo text-4xl font-black italic tracking-tighter select-none">SSS</span>
          </div>
          <nav className="flex flex-row lg:flex-col gap-1 w-full lg:w-auto justify-around lg:justify-start">
            <div onClick={() => setView('feed')} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'feed' ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              <svg className={`w-5 h-5 ${view === 'feed' ? 'text-[#ff2a5f]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg>
              <span className="text-[14px] font-bold tracking-tight hidden sm:inline lg:inline">Лента</span>
            </div>
            <div onClick={() => { setCurrentProfile(user.username); setView('profile'); setActiveTab('posts'); }} className={`flex items-center justify-center lg:justify-start gap-3 p-3 cursor-pointer rounded-xl transition-all duration-300 flex-1 lg:flex-none ${view === 'profile' && isOwnProfile ? 'bg-white/5 text-white lg:border-r-2 lg:border-[#ff2a5f]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
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
        <main className="flex-1 w-full max-w-[680px] flex flex-col gap-4 md:gap-5">
          {view === 'profile' && (
            <div className="glass-card rounded-2xl md:rounded-[36px] overflow-hidden shadow-2xl border-white/10">
              <div className="h-28 md:h-40 bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#080808]"></div>
              <div className="px-4 md:px-8 pb-6 md:pb-8 relative">
                
                {/* Аватарка и Кнопки управления */}
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end -mt-10 md:-mt-12 mb-6 gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl md:rounded-[28px] bg-[#111] border-[4px] md:border-[5px] border-[#080808] flex items-center justify-center text-4xl md:text-5xl shadow-2xl">
                      {profileData.avatar_emoji || '🤩'}
                    </div>
                    {isOwnProfile && (
                      <div className="absolute -bottom-1 -right-1 z-50">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEmojiPickerOpen(!isEmojiPickerOpen);
                          }}
                          className="w-8 h-8 md:w-9 md:h-9 bg-[#ff2a5f] rounded-xl flex items-center justify-center border-[2px] md:border-[3px] border-[#080808] hover:scale-110 transition-transform cursor-pointer shadow-lg active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {isEmojiPickerOpen && (
                          <div 
                            className="absolute top-full left-0 mt-3 p-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl grid grid-cols-5 gap-1 w-44 backdrop-blur-xl z-[100]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {EMOJI_LIST.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleEmojiSelect(emoji)}
                                className="text-lg p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer hover:scale-125 border-none bg-transparent"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex gap-2 w-full md:w-auto justify-center">
                    {isOwnProfile ? (
                      <button onClick={handleSaveProfile} className={`flex-1 md:flex-none px-4 md:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${isEditing ? 'bg-[#ff2a5f] border-[#ff2a5f] text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black'}`}>
                        {isEditing ? 'Сохранить' : 'Редактировать'}
                      </button>
                    ) : (
                      <button 
                        onClick={handleFollow} 
                        className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border ${profileData.isSubscribed ? 'bg-white/5 border-white/10 text-white' : 'bg-[#ff2a5f] border-[#ff2a5f] text-white shadow-lg shadow-[#ff2a5f]/20 hover:scale-105 active:scale-95'}`}>
                        {profileData.isSubscribed ? 'Отписаться' : 'Подписаться'}
                      </button>
                    )}
                    <button className="bg-gradient-to-r from-[#ff2a5f] to-[#7e22ce] text-white px-4 md:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[#ff2a5f]/20">Premium</button>
                  </div>
                </div>

                {/* Основная Инфо-зона профиля */}
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

                {/* Вкладки Записи/Репосты */}
                <div className="flex mt-6 p-1 bg-black/40 rounded-xl">
                  <div onClick={() => setActiveTab('posts')} className={`flex-1 py-2.5 text-center rounded-lg font-black text-[11px] cursor-pointer uppercase transition-all ${activeTab === 'posts' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>Записи</div>
                  <div onClick={() => setActiveTab('reposts')} className={`flex-1 py-2.5 text-center rounded-lg font-black text-[11px] cursor-pointer uppercase transition-all ${activeTab === 'reposts' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>Репосты</div>
                </div>
              </div>
            </div>
          )}

          {view === 'feed' && (
              <div className="px-2 mb-2"><h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic sss-logo text-center sm:text-left">Global Stream</h1></div>
          )}

          {/* Создание нового поста */}
          {(view === 'feed' || (isOwnProfile && activeTab === 'posts')) && (
            <div className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6 shadow-xl">
              <div className="flex gap-3 md:gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-2xl flex-shrink-0">{profileData.avatar_emoji || '🤩'}</div>
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

          {/* Лента Постов */}
          <div className="flex flex-col gap-4 mb-16">
            {posts.length > 0 && posts.map((post) => (
              <div key={post.id} className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6 transition-all group hover:border-white/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div onClick={() => goToProfile(post.username)} className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-gray-800 to-[#111] flex items-center justify-center text-lg cursor-pointer hover:scale-105 transition-transform flex-shrink-0">
                      {post.avatar_emoji || '🤩'}
                    </div>
                    <div>
                      <p onClick={() => goToProfile(post.username)} className="font-black text-xs md:text-[13px] uppercase tracking-tight text-white/90 cursor-pointer hover:text-[#ff2a5f] transition-colors">{post.username}</p>
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
                
                {/* Кнопки взаимодействий (Лайк, Коммент, Репост) */}
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
                        placeholder="Написать комментарий..." 
                        className="comment-input"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                      />
                      <button onClick={() => handleSendComment(post.id)} className="p-2 bg-[#ff2a5f] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-20 text-gray-700 font-black uppercase text-[10px] tracking-[0.3em] opacity-40">
                {activeTab === 'reposts' 
                  ? (isOwnProfile ? 'У вас еще нет репостов' : 'У пользователя нет репостов')
                  : (isOwnProfile ? 'Вы еще ничего не опубликовали' : 'Здесь пока пусто')}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;