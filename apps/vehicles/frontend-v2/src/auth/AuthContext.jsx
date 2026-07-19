import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { changePassword, fetchMe, loginEntra, loginLocal, logout } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((data) => {
        if (!alive) return;
        setUser(data?.data?.user || null);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
      })
      .finally(() => {
        if (!alive) return;
        setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      async loginWithLocal(username, password) {
        const data = await loginLocal({ username, password });
        setUser(data?.data?.user || null);
        return data;
      },
      async loginWithEntra() {
        const data = await loginEntra();
        setUser(data?.data?.user || null);
        return data;
      },
      async changeLocalPassword(newPassword) {
        const data = await changePassword({ new_password: newPassword });
        setUser(data?.data?.user || null);
        return data;
      },
      async signOut() {
        await logout();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vehicles_v2_dashboard_settings');
        }
        setUser(null);
      },
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
