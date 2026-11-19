'use client';

/**
 * Auth Context
 * Manages in-memory session state backed strictly by server-managed HttpOnly cookies.
 * Raw access and refresh tokens are never persisted in localStorage or JS-readable cookies.
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Clean up any legacy insecure token storage left from prior versions
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('app_session');
      } catch {
        // ignore storage errors
      }
    }

    const restoreSession = async () => {
      try {
        const activeSession = await gatewayApi.auth.session();
        if (!isMounted) return;
        setSession(activeSession);
        return;
      } catch {
        // Access cookie may be expired; attempt cookie-based refresh
      }

      try {
        const refreshedSession = await gatewayApi.auth.refresh();
        if (!isMounted) return;
        setSession(refreshedSession);
      } catch {
        if (isMounted) {
          setSession(null);
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

    const handleSessionExpired = () => {
      setSession(null);
    };

    void restoreSession();
    window.addEventListener('auth_token_refreshed', handleAuthTokenRefreshed as EventListener);
    window.addEventListener('auth_session_expired', handleSessionExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('auth_token_refreshed', handleAuthTokenRefreshed as EventListener);
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signup = useCallback(async (email: string, username: string, password: string, role?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await gatewayApi.auth.signup({
        email,
        username,
        password,
        role: (role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN') || 'STUDENT',
      });
      setSession(result);
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
      await gatewayApi.auth.logout();
    } catch (err) {
      console.warn('Backend logout request failed; clearing client session state:', err);
    } finally {
      setSession(null);
      setIsLoading(false);
    }
  }, []);

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
