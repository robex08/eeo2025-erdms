import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: string | number;
  email: string;
  name: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  department?: string;
  jobTitle?: string;
  entraData?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastStableUserRef = useRef<User | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refreshProfile = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
    try {
      // DEV MODE: Mock user pro localhost
      if (window.location.hostname === 'localhost') {
        const devUser = {
          id: '999',
          email: 'dev@test.cz',
          name: 'Dev Testovací',
          displayName: 'Dev Testovací',
          givenName: 'Dev',
          surname: 'Testovací',
          department: 'IT',
          jobTitle: 'Developer',
          entraData: {}
        };
        setUser(devUser);
        lastStableUserRef.current = devUser;
        setIsLoading(false);
        return;
      }

      // PRODUCTION: Volá centrální Auth API (EntraID) přes cookie session
      const response = await axios.get('https://erdms.zachranka.cz/auth/me', {
        timeout: 8000,
        withCredentials: true // Pošle erdms_session cookie
      });
      
      const entradata = response.data;
      const resolvedUser = {
        id: entradata.id || entradata.entra_id || '0',
        email: entradata.email || '',
        name: entradata.displayName || entradata.name || '',
        displayName: entradata.displayName,
        givenName: entradata.jmeno || entradata.givenName,
        surname: entradata.prijmeni || entradata.surname,
        department: entradata.entraData?.department,
        jobTitle: entradata.jobTitle || '',
        entraData: entradata.entraData
      };
      setUser(resolvedUser);
      lastStableUserRef.current = resolvedUser;
    } catch (error) {
      console.error('Failed to load profile:', error);

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const isAuthError = status === 401 || status === 403;

      // Pro skutečný auth error uživatele odhlásíme.
      if (isAuthError) {
        setUser(null);
        lastStableUserRef.current = null;
      } else {
        // Pro timeout/network chyby držíme poslední validní session, aby UI neblikalo.
        setUser((prev) => prev || lastStableUserRef.current);
      }
    } finally {
      setIsLoading(false);
    }
    })();

    refreshInFlightRef.current = refreshPromise;
    try {
      await refreshPromise;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, []);

  // Load user profile on mount
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async () => {
    try {
      // Zavolej Auth API pro EntraID redirect
      // Použij celou aktuální URL (bez query parametrů)
      const currentUrl = window.location.origin + window.location.pathname;
      const redirectUri = encodeURIComponent(currentUrl);
      
      console.log('🔐 Login redirect:', currentUrl); // Debug
      
      const response = await axios.get(`https://erdms.zachranka.cz/auth/login?redirect=${redirectUri}`, {
        withCredentials: true
      });
      
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await axios.post('https://erdms.zachranka.cz/auth/logout', {}, {
        withCredentials: true
      });
      setUser(null);
      window.location.href = '/dev/intranet-web';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
