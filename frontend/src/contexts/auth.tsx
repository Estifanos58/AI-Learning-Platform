'use client';

/**
 * Auth Context
 * Manages session state and auth operations globally
 */

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AuthSession, AuthUserSummary } from '@/src/lib/types';
import { gatewayApi } from '@/src/lib/api/gateway';

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUserSummary | null;
  isLoading: boolean;
  error: string | null;
  signup: (email: string, username: string, password: string, role?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_STORAGE_KEY = 'app_session';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function persistSession(nextSession: AuthSession | null) {
  if (typeof window === 'undefined') return;

  if (!nextSession) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setAuthCookies(null);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  setAuthCookies(nextSession);
}

function setAuthCookies(session: AuthSession | null) {
  if (typeof document === 'undefined') return;

  if (!session) {
    document.cookie = 'app_access_token=; Max-Age=0; Path=/; SameSite=Strict';
    document.cookie = 'app_refresh_token=; Max-Age=0; Path=/; SameSite=Strict';
    return;
  }

  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  const expires = session.accessTokenExpiresInSeconds ? session.accessTokenExpiresInSeconds : 3600;
  const accessMaxAge = Math.max(60, expires);

  document.cookie = `app_access_token=${encodeURIComponent(session.accessToken)}; Max-Age=${accessMaxAge}; Path=/; SameSite=Lax${secureFlag}`;
  document.cookie = `app_refresh_token=${encodeURIComponent(session.refreshToken)}; Max-Age=${60 * 60 * 24 * 7}; Path=/; SameSite=Lax${secureFlag}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession) as AuthSession;
          if (!isMounted) return;
          setSession(parsedSession);
          setAuthCookies(parsedSession);
          return;
        }

        const refreshToken = getCookie('app_refresh_token');
        if (!refreshToken) {
          if (isMounted) {
            setSession(null);
          }
          return;
        }

        const refreshedSession = await gatewayApi.auth.refresh({ refreshToken });
        if (!isMounted) return;

        setSession(refreshedSession);
        persistSession(refreshedSession);
      } catch (err) {
        console.error('[v0] Failed to restore session:', err);
        if (isMounted) {
          setSession(null);
          persistSession(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const handleAuthTokenRefreshed = (event: Event) => {
      const refreshedSession = (event as CustomEvent<AuthSession | null>).detail;
      if (!refreshedSession) return;
      setSession(refreshedSession);
    };

    void restoreSession();
    window.addEventListener('auth_token_refreshed', handleAuthTokenRefreshed as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener('auth_token_refreshed', handleAuthTokenRefreshed as EventListener);
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signup = useCallback(async (email: string, username: string, password: string, role?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await gatewayApi.auth.signup({ email, username, password, role: (role as any) || 'STUDENT' });
      setSession(result);
      persistSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await gatewayApi.auth.login({ email, password });
      setSession(result);
      persistSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (session?.refreshToken) {
        await gatewayApi.auth.logout(session.refreshToken);
      }
    } catch (err) {
      console.warn('Backend logout request failed; clearing local session anyway:', err);
    } finally {
      setSession(null);
      persistSession(null);
      setIsLoading(false);
    }
  }, [session]);

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    isLoading,
    error,
    signup,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
