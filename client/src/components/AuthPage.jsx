import React, { useState } from 'react';

// Твой рабочий бэкенд на Render
const API_BASE_URL = 'https://sss-backend-haev.onrender.com';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      // Подключаем к актуальному адресу на Render
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        onLogin(data); // Передаем данные юзера в главный компонент
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Ошибка соединения с сервером");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111111] border border-white/5 rounded-[32px] p-8">
        <h2 className="text-2xl font-bold mb-6 uppercase tracking-tighter text-center">
          {isLogin ? 'Вход в SSS' : 'Регистрация'}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Никнейм" 
            className="bg-[#1d1d1d] border-none rounded-2xl p-4 outline-none focus:ring-1 ring-white/20"
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          {!isLogin && (
            <input 
              type="email" 
              placeholder="Email" 
              className="bg-[#1d1d1d] border-none rounded-2xl p-4 outline-none focus:ring-1 ring-white/20"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          )}
          <input 
            type="password" 
            placeholder="Пароль" 
            className="bg-[#1d1d1d] border-none rounded-2xl p-4 outline-none focus:ring-1 ring-white/20"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <button className="bg-white text-black font-bold py-4 rounded-2xl mt-2 hover:bg-gray-200 transition-all uppercase tracking-widest text-sm">
            {isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"} {' '}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-white hover:underline font-bold"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;