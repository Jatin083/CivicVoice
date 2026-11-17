import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [ready, setReady] = useState(false); // true once the stored session has been checked

  // On start: if a token exists, ask the API who it belongs to. A 401/403 clears it.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setReady(true);
      return undefined;
    }
    api
      .get('/auth/me')
      .then((res) => !cancelled && setUser(res.data))
      .catch((err) => {
        if (cancelled) return;
        // Only a rejected token ends the session; a network blip or 429 keeps it.
        if (err.status !== 401 && err.status !== 403) return;
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
    // only on first load; login/logout set user directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // The axios interceptor fires this when any request comes back 401.
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const saveSession = useCallback(({ token: t, user: u }) => {
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data), [saveSession]);
  const register = useCallback(async (payload) => saveSession((await api.post('/auth/register', payload)).data), [saveSession]);

  const value = useMemo(
    () => ({ user, token, ready, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, token, ready, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
