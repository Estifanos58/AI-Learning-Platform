'use client';

/**
 * Auth Context
 * Manages session state and auth operations globally
 */

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AuthSession, AuthUserSummary } from '@/src/lib/types';
import { authMockService } from '@/src/lib/mocks';

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUserSummary | null;
  isLoading: boolean;
  error: string | null;
  signup: (email: string, username: string, password: string, role: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_STORAGE_KEY = 'app_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        setSession(JSON.parse(savedSession));
      }
    } catch (err) {
      console.error('[v0] Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signup = useCallback(async (email: string, username: string, password: string, role: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authMockService.signup({ email, username, password, role: role as any });
      setSession(result);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result));
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
      const result = await authMockService.login({ email, password });
      setSession(result);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result));
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
      if (session?.user.id) {
        await authMockService.logout(session.user.id);
      }
      setSession(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
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
