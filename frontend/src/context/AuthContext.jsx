import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      if (!token) { setLoading(false); return; }
      try {
        const me = await api('/auth/me', { token });
        setUser(me);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, [token]);

  function login(payload, slug) {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem('token', payload.token);
    if (slug) localStorage.setItem('tenantSlug', slug);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('tenantSlug');
    navigate('/login');
  }

  function navigate(path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  const value = useMemo(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
