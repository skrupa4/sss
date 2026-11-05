import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { SocketProvider, useSocket } from '../context/SocketContext';
import Sidebar from '../components/layout/Sidebar';
import ProfileHeader from '../components/profile/ProfileHeader';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';
import ChatList from '../components/messages/ChatList';
import ChatWindow from '../components/messages/ChatWindow';
import NotificationList from '../components/notifications/NotificationList';
import Loader from '../components/common/Loader';

const MainAppContent = ({ user, onLogout, onUpdateUser }) => {
  const [view, setView] = useState('feed');
  const [currentProfile, setCurrentProfile] = useState(user.username);
  const [profileData, setProfileData] = useState({ username: user.username, bio: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [activeComments, setActiveComments] = useState({});

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadChats, setUnreadChats] = useState({});

  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const socket = useSocket();
  const isOwnProfile = currentProfile === user.username;

  // --- Real-time WebSocket слушатели (прием уведомлений и сообщений IRL) ---
  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadNotifsCount(prev => prev + 1);
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  // Загрузка данных профиля и постов
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentProfile}?viewer=${user.username}`);
      if (res.ok) setProfileData(await res.json());
    } catch (e) { console.error(e); }
  }, [currentProfile, user.username]);

  const loadPosts = useCallback(async () => {
    try {
      const url = view === 'feed'
        ? `${API_BASE_URL}/api/posts`
        : activeTab === 'posts'
          ? `${API_BASE_URL}/api/posts/user/${currentProfile}`
          : `${API_BASE_URL}/api/posts/reposts/${currentProfile}`;
      const res = await fetch(url);
      if (res.ok) setPosts(await res.json());
    } catch (e) { console.error(e); }
  }, [view, activeTab, currentProfile]);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/chats?username=${user.username}`);
      if (res.ok) setChats(await res.json());
    } catch (e) { console.error(e); }
  }, [user.username]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?username=${user.username}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadNotifsCount(data.filter(n => !n.is_read).length);
      }
    } catch (e) { console.error(e); }
  }, [user.username]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadProfile(), loadPosts(), loadChats(), loadNotifications()]).finally(() => setIsLoading(false));
  }, [loadProfile, loadPosts, loadChats, loadNotifications]);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileData.username,
          bio: profileData.bio,
          clan: profileData.clan,
          avatar_url: profileData.avatar_url
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        setIsEditing(false);
        if (onUpdateUser) onUpdateUser(updated);
      }
    } catch (e) { console.error(e); }
  };

  const handlePublishPost = async (content) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, content })
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
      }
    } catch (e) { console.error(e); }
  };

  const handleViewChange = (newView, targetUser = null) => {
    if (targetUser) setCurrentProfile(targetUser);
    setView(newView);
    if (newView !== 'messages') setActiveChat(null);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex justify-center items-start pt-4 md:pt-8 px-3 md:px-6 pb-24 lg:pb-8 antialiased">
      <Loader show={isLoading} />

      <div className="w-full max-w-[1100px] flex flex-col lg:flex-row gap-6 justify-center">
        <Sidebar
          view={view}
          onViewChange={handleViewChange}
          unreadMessages={Object.values(unreadChats).reduce((a, b) => a + b, 0)}
          unreadNotifications={unreadNotifsCount}
          onLogout={onLogout}
          currentUser={user}
        />

        <main className="flex-1 w-full max-w-[680px]">
          {view === 'profile' && (
            <>
              <ProfileHeader
                profileData={profileData}
                isOwnProfile={isOwnProfile}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                setProfileData={setProfileData}
                handleSaveProfile={handleSaveProfile}
                handleFollow={() => {}}
                onOpenMessage={() => {
                  setActiveChat({ username: profileData.username, avatar_url: profileData.avatar_url });
                  setView('messages');
                }}
              />
              <div className="flex mb-4 p-1 bg-black/40 rounded-xl border border-white/5">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex-1 py-2 text-center rounded-lg font-black text-xs uppercase transition-all ${activeTab === 'posts' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                >
                  Записи
                </button>
                <button
                  onClick={() => setActiveTab('reposts')}
                  className={`flex-1 py-2 text-center rounded-lg font-black text-xs uppercase transition-all ${activeTab === 'reposts' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                >
                  Репосты
                </button>
              </div>
            </>
          )}

          {(view === 'feed' || (view === 'profile' && isOwnProfile && activeTab === 'posts')) && (
            <CreatePost user={user} onPublish={handlePublishPost} />
          )}

          {view === 'messages' && (
            <div className="glass-card rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex h-[75vh] md:h-[80vh]">
              {!activeChat ? (
                <ChatList
                  chats={chats}
                  activeChat={activeChat}
                  onSelectChat={async (chat) => {
                    setActiveChat(chat);
                    const res = await fetch(`${API_BASE_URL}/api/messages/history?user1=${user.username}&user2=${chat.username}`);
                    if (res.ok) setMessages(await res.json());
                  }}
                  unreadChats={unreadChats}
                />
              ) : (
                <ChatWindow
                  activeChat={activeChat}
                  currentUser={user}
                  messages={messages}
                  setMessages={setMessages}
                  onBack={() => setActiveChat(null)}
                  onUserClick={(u) => handleViewChange('profile', u)}
                />
              )}
            </div>
          )}

          {view === 'notifications' && (
            <NotificationList
              notifications={notifications}
              onMarkAllAsRead={async () => {
                await fetch(`${API_BASE_URL}/api/notifications/read`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: user.username })
                });
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadNotifsCount(0);
              }}
              onUserClick={(u) => handleViewChange('profile', u)}
            />
          )}

          {(view === 'feed' || view === 'profile') && (
            <div className="flex flex-col gap-3">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={user}
                  onLike={() => {}}
                  onRepost={() => {}}
                  onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
                  onSendComment={() => {}}
                  activeComments={activeComments[post.id]}
                  onToggleComments={() => {}}
                  onUserClick={(u) => handleViewChange('profile', u)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default function ProfilePageWrapper(props) {
  return (
    <SocketProvider user={props.user}>
      <MainAppContent {...props} />
    </SocketProvider>
  );
}