import { AuthSession, Role } from '@/src/lib/types';
import { authMockService } from '@/src/lib/mocks';
import { apiRequest, mapErrorMessage } from './gateway-core';
import { loginSchema, refreshSchema, signupSchema, verifyEmailSchema } from './gateway-schemas';

export const authApi = {
  async signup(input: { email: string; username: string; password: string; role: Role }): Promise<AuthSession> {
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

  forgotPassword: (input: { email: string }) => authMockService.forgotPassword(input),
  resetPassword: (input: { token: string; newPassword: string }) => authMockService.resetPassword(input),
};
