import React, { useState, useEffect } from 'react';
import ProfilePage from "./pages/ProfilePage"; 
import AuthPage from "./pages/AuthPage";

function App() {
  const [user, setUser] = useState(null);

  // Эффект для автоматического входа при загрузке страницы
  useEffect(() => {
    const savedUser = localStorage.getItem('sss_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Ошибка парсинга пользователя из localStorage", e);
        localStorage.removeItem('sss_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    const fullUser = {
      ...userData,
      handle: userData.username ? userData.username.toLowerCase() : '',
      followers: userData.followers || 0,
      following: userData.following || 0,
      achievements: userData.achievements || 0,
      regDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : "май 2026г."
    };
    
    localStorage.setItem('sss_user', JSON.stringify(fullUser));
    setUser(fullUser);
  };

  const handleUpdateUser = (updatedUserData) => {
    const updatedUser = {
      ...user,
      ...updatedUserData
    };
    localStorage.setItem('sss_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('sss_user');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      {user ? (
        <ProfilePage user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;