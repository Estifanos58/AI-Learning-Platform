import { AuthSession, AuthUserSummary, Role } from '@/src/lib/types';
import { apiRequest, mapErrorMessage } from '@/src/lib/api/gateway-core';
import { loginSchema, refreshSchema, signupSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from './gateway-schemas';

export const authApi = {
  async signup(input: { email: string; username: string; password: string; role?: Role }): Promise<AuthSession> {
    try {
      const payload = signupSchema.parse(input);
      const res = await apiRequest<{ message: string } & AuthSession>('/auth/signup', { method: 'POST', body: payload, cache: 'no-store' });
      return { accessToken: res.accessToken, refreshToken: res.refreshToken, tokenType: res.tokenType, accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds, user: res.user };
    } catch (error) { throw new Error(mapErrorMessage(error, 'Signup failed')); }
  },

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    try {
      const payload = loginSchema.parse(input);
      const res = await apiRequest<{ message: string } & AuthSession>('/auth/login', { method: 'POST', body: payload, cache: 'no-store' });
      return { accessToken: res.accessToken, refreshToken: res.refreshToken, tokenType: res.tokenType, accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds, user: res.user };
    } catch (error) { throw new Error(mapErrorMessage(error, 'Login failed')); }
  },

  async verifyEmail(input: { token: string }): Promise<{ message: string }> {
    try { return await apiRequest<{ message: string }>('/auth/verify-email', { method: 'POST', body: verifyEmailSchema.parse(input), cache: 'no-store' });
    } catch (error) { throw new Error(mapErrorMessage(error, 'Email verification failed')); }
  },

  async refresh(input: { refreshToken: string }): Promise<AuthSession> {
    const res = await apiRequest<{ message: string } & AuthSession>('/auth/refresh', { method: 'POST', body: refreshSchema.parse(input), cache: 'no-store' });
    return { accessToken: res.accessToken, refreshToken: res.refreshToken, tokenType: res.tokenType, accessTokenExpiresInSeconds: res.accessTokenExpiresInSeconds, user: res.user };
  },

  async logout(refreshToken: string): Promise<void> {
    await apiRequest<{ message: string }>('/auth/logout', { method: 'POST', body: refreshSchema.parse({ refreshToken }), cache: 'no-store' });
  },

  async forgotPassword(input: { email: string }): Promise<{ message: string }> {
    try {
      const payload = forgotPasswordSchema.parse(input);
      return await apiRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', body: payload, cache: 'no-store' });
    } catch (error) { throw new Error(mapErrorMessage(error, 'Password reset request failed')); }
  },

  async resetPassword(input: { token: string; newPassword: string }): Promise<{ message: string }> {
    try {
      const payload = resetPasswordSchema.parse(input);
      return await apiRequest<{ message: string }>('/auth/reset-password', { method: 'POST', body: payload, cache: 'no-store' });
    } catch (error) { throw new Error(mapErrorMessage(error, 'Password reset failed')); }
  },

  async updateUserRole(token: string, userId: string, role: Role): Promise<AuthUserSummary> {
    try {
      return await apiRequest<AuthUserSummary>(`/auth/users/${encodeURIComponent(userId)}/role`, {
        method: 'PUT',
        token,
        body: { role },
        cache: 'no-store',
      });
    } catch (error) { throw new Error(mapErrorMessage(error, 'Failed to update user role')); }
  },
};
