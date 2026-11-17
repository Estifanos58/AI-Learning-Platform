/**
 * Authentication Types
 * Typed mock contracts for auth system
 */

export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export type AuthStatus = 'UNVERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface AuthUserSummary {
  id: string;
  email: string;
  username: string;
  role: Role;
  status: AuthStatus;
  emailVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessTokenExpiresInSeconds: number;
  user: AuthUserSummary;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  username: string;
  password: string;
  role?: Role;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
