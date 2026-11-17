'use client';

import { gatewayApi } from '@/src/lib/api/gateway';
import { AuthSession, Role, UserProfile } from '@/src/lib/types';

export function useGatewayAuth() {
  return {
    signup: (payload: { email: string; username: string; password: string; role: Role }) => gatewayApi.auth.signup(payload),
    login: (payload: { email: string; password: string }) => gatewayApi.auth.login(payload),
    verifyEmail: (payload: { token: string }) => gatewayApi.auth.verifyEmail(payload),
    refresh: (payload: { refreshToken: string }) => gatewayApi.auth.refresh(payload),
    logout: (refreshToken: string) => gatewayApi.auth.logout(refreshToken),
    forgotPassword: (payload: { email: string }) => gatewayApi.auth.forgotPassword(payload),
    resetPassword: (payload: { token: string; newPassword: string }) => gatewayApi.auth.resetPassword(payload),
  };
}

export type GatewayAuthSession = AuthSession;
export type GatewayProfile = UserProfile;
