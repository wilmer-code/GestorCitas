import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      if (!token) {
        setLoading(false);
        return;
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function login(payload) {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem('token', payload.token);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    window.history.pushState({}, '', '/login');
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
