import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const handleAuth = useCallback(({ token, user }) => {
    localStorage.setItem('token', token);
    setUser(user);
  }, []);

  const login = useCallback(
    async (email, password) => handleAuth(await api('/auth/login', { method: 'POST', body: { email, password } })),
    [handleAuth]
  );

  const register = useCallback(
    async (name, email, password) =>
      handleAuth(await api('/auth/register', { method: 'POST', body: { name, email, password } })),
    [handleAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
