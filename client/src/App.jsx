import React, { useState, useEffect } from 'react'; // 1. Добавили useEffect
import ProfilePage from "./components/ProfilePage"; 
import AuthPage from "./components/AuthPage";

function App() {
  const [user, setUser] = useState(null);

  // 2. Эффект для автоматического входа при загрузке страницы
  useEffect(() => {
    const savedUser = localStorage.getItem('sss_user');
    if (savedUser) {
      // Если нашли строку в памяти, превращаем её обратно в объект и вставляем в стейт
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    const fullUser = {
      ...userData,
      handle: userData.username.toLowerCase(),
      followers: 0,
      following: 0,
      achievements: 0,
      regDate: "май 2026г."
    };
    
    // 3. Сохраняем данные в localStorage в виде строки
    localStorage.setItem('sss_user', JSON.stringify(fullUser));
    setUser(fullUser);
  };

  const handleLogout = () => {
    // 4. Очищаем память при выходе
    localStorage.removeItem('sss_user');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {user ? (
        <ProfilePage user={user} onLogout={handleLogout} />
      ) : (
        <AuthPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;