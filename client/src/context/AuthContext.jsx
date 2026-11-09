/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    try { localStorage.removeItem('sss_user'); } catch { /* старый формат хранения */ }
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // При загрузке страницы подтягиваем актуального пользователя по токену.
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api.get('/api/me')
      .then((me) => { if (!cancelled) setUser(me); })
      .catch((err) => { if (!cancelled && err.status === 401) logout(); })
      .finally(() => { if (!cancelled) setBooting(false); });
    return () => { cancelled = true; };
  }, [logout]);

  const authenticate = useCallback(async (endpoint, payload) => {
    const data = await api.post(endpoint, payload);
    if (data.needsCode || data.needs2fa) return data; // нужен код из письма — токена ещё нет
    tokenStore.set(data.token);
    setUser(data.user);
    return data;
  }, []);

  const value = useMemo(() => ({
    user,
    booting,
    login: (username, password) => authenticate('/api/login', { username, password }),
    register: (username, email, password) => authenticate('/api/register', { username, email, password }),
    verifyRegistration: (email, code) => authenticate('/api/register/verify', { email, code }),
    resendCode: (email) => api.post('/api/register/resend', { email }),
    verifyLogin: (ticket, code) => authenticate('/api/login/2fa', { ticket, code }),
    resendLoginCode: (ticket) => api.post('/api/login/2fa/resend', { ticket }),
    logout,
    updateUser: setUser,
  }), [user, booting, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
