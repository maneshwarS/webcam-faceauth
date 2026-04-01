import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { setAccessToken, clearAccessToken } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while attempting silent refresh

  // Attempt to restore session on mount via httpOnly refresh cookie
  useEffect(() => {
    async function silentRefresh() {
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch {
        // No valid session — stay logged out
      } finally {
        setLoading(false);
      }
    }
    silentRefresh();
  }, []);

  // Listen for forced sign-out events from the axios interceptor
  useEffect(() => {
    function handleSignout() {
      setUser(null);
      clearAccessToken();
    }
    window.addEventListener('auth:signout', handleSignout);
    return () => window.removeEventListener('auth:signout', handleSignout);
  }, []);

  const login = useCallback((userData, token) => {
    setAccessToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/signout', {}, { withCredentials: true });
    } catch {
      // Ignore errors — clear state regardless
    }
    clearAccessToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
