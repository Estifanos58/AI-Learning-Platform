import { AuthSession, AuthUserSummary, Role } from '@/src/lib/types';
import { apiRequest, mapErrorMessage } from '@/src/lib/api/gateway-core';
import { COOKIE_SESSION_SENTINEL } from './core/csrf';
import { loginSchema, signupSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from './gateway-schemas';

function toClientSession(res: Partial<AuthSession> & { user: AuthUserSummary }): AuthSession {
  return {
    accessToken: COOKIE_SESSION_SENTINEL,
    refreshToken: '',
    tokenType: res.tokenType || 'Bearer',
    accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds || 900,
    user: res.user,
  };
}

export const authApi = {
  async session(): Promise<AuthSession> {
    const res = await apiRequest<{ authenticated: boolean; user: AuthUserSummary; csrfToken?: string }>('/auth/session', {
      method: 'GET',
      cache: 'no-store',
    });
    return toClientSession({ user: res.user });
  },

  async csrf(): Promise<{ csrfToken: string }> {
    return apiRequest<{ csrfToken: string }>('/auth/csrf', { method: 'GET', cache: 'no-store' });
  },

  async signup(input: { email: string; username: string; password: string; role?: Role }): Promise<AuthSession> {
    try {
      const payload = signupSchema.parse(input);
      const res = await apiRequest<{ message: string } & Partial<AuthSession> & { user: AuthUserSummary }>('/auth/signup', {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      });
      return toClientSession(res);
    } catch (error) {
      throw new Error(mapErrorMessage(error, 'Signup failed'));
    }
  },

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    try {
      const payload = loginSchema.parse(input);
      const res = await apiRequest<{ message: string } & Partial<AuthSession> & { user: AuthUserSummary }>('/auth/login', {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      });
      return toClientSession(res);
    } catch (error) {
      throw new Error(mapErrorMessage(error, 'Login failed'));
    }
  },

  async verifyEmail(input: { token: string }): Promise<{ message: string }> {
    try {
      return await apiRequest<{ message: string }>('/auth/verify-email', {
        method: 'POST',
        body: verifyEmailSchema.parse(input),
        cache: 'no-store',
      });
    } catch (error) {
      throw new Error(mapErrorMessage(error, 'Email verification failed'));
    }
  },

  async refresh(_input?: { refreshToken?: string }): Promise<AuthSession> {
    const res = await apiRequest<{ message: string } & Partial<AuthSession> & { user: AuthUserSummary }>('/auth/refresh', {
      method: 'POST',
      body: {},
      cache: 'no-store',
    });
    return toClientSession(res);
  },

  async logout(_refreshToken?: string): Promise<void> {
    await apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: {},
      cache: 'no-store',
    });
  },

  async forgotPassword(input: { email: string }): Promise<{ message: string }> {
    try {
      const payload = forgotPasswordSchema.parse(input);
      return await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      });
    } catch (error) {
      throw new Error(mapErrorMessage(error, 'Password reset request failed'));
    }
  },

  async resetPassword(input: { token: string; newPassword: string }): Promise<{ message: string }> {
    try {
      const payload = resetPasswordSchema.parse(input);
      return await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      });
    } catch (error) {
      throw new Error(mapErrorMessage(error, 'Password reset failed'));
    }
  },

  async updateUserRole(token: string, userId: string, role: Role): Promise<AuthUserSummary> {
    try {
      return await apiRequest<AuthUserSummary>(`/auth/users/${encodeURIComponent(userId)}/role`, {
        method: 'PUT',
        token,
        body: { role },
        cache: 'no-store',
      });
    } catch (error) {
      throw new Error(mapErrorMessage(error, 'Failed to update user role'));
    }
  },
};
