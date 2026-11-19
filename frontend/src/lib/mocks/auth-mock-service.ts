/**
 * Mock Authentication Service
 * Simulates async auth operations with artificial delay
 */

import {
  AuthCredentials,
  AuthSession,
  AuthUserSummary,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SignUpRequest,
  VerifyEmailRequest,
} from '@/src/lib/types';

const MOCK_DELAY = 300;

// In-memory user store (deterministic)
const mockUsers = new Map<string, any>([
  [
    'user-1',
    {
      id: 'user-1',
      email: 'demo@example.com',
      username: 'demouser',
      password: 'password123', // Mock only
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true,
    },
  ],
]);

const mockSessions = new Map<string, AuthSession>();

// Generate deterministic session token
function generateToken(userId: string): string {
  return `token_${userId}_${Date.now()}`;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authMockService = {
  async signup(request: SignUpRequest): Promise<AuthSession> {
    await delay(MOCK_DELAY);

    // Check if user exists
    for (const user of mockUsers.values()) {
      if (user.email === request.email) {
        throw new Error('Email already registered');
      }
    }

    // Create new user
    const newUserId = `user-${Date.now()}`;
    const newUser: AuthUserSummary = {
      id: newUserId,
      email: request.email,
      username: request.username,
      role: request.role ?? 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true,
    };

    mockUsers.set(newUserId, {
      ...newUser,
      password: request.password, // Mock only
    });

    // Create session
    const session: AuthSession = {
      accessToken: generateToken(newUserId),
      refreshToken: generateToken(newUserId) + '_refresh',
      tokenType: 'Bearer',
      accessTokenExpiresInSeconds: 3600,
      user: newUser,
    };

    mockSessions.set(newUserId, session);
    return session;
  },

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    await delay(MOCK_DELAY);

    let user = null;
    let userId = '';

    for (const [id, u] of mockUsers.entries()) {
      if (u.email === credentials.email) {
        user = u;
        userId = id;
        break;
      }
    }

    if (!user || user.password !== credentials.password) {
      throw new Error('Invalid email or password');
    }

    const session: AuthSession = {
      accessToken: generateToken(userId),
      refreshToken: generateToken(userId) + '_refresh',
      tokenType: 'Bearer',
      accessTokenExpiresInSeconds: 3600,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };

    mockSessions.set(userId, session);
    return session;
  },

  async verifyEmail(request: VerifyEmailRequest): Promise<AuthUserSummary> {
    await delay(MOCK_DELAY);

    // Mock: token validation (always succeeds for demo tokens)
    if (!request.token || request.token.length < 5) {
      throw new Error('Invalid verification token');
    }

    // Mark first user as verified (demo only)
    const user = mockUsers.get('user-1');
    if (user) {
      user.emailVerified = true;
      user.status = 'ACTIVE';
    }

    return user;
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const user = Array.from(mockUsers.values()).find((u) => u.email === request.email);
    if (!user) {
      throw new Error('Email not found');
    }

    // Mock: In real system, would send reset email
    return { message: 'Password reset link sent to email' };
  },

  async resetPassword(request: ResetPasswordRequest): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    // Mock token validation
    if (!request.token || request.newPassword.length < 8) {
      throw new Error('Invalid token or password');
    }

    // Mock: In real system, would validate token and update password
    return { message: 'Password reset successfully' };
  },

  async refresh(refreshToken: string): Promise<AuthSession> {
    await delay(MOCK_DELAY);

    // Mock: Find session by refresh token
    for (const [userId, session] of mockSessions.entries()) {
      if (session.refreshToken === refreshToken) {
        const newSession: AuthSession = {
          ...session,
          accessToken: generateToken(userId),
        };
        mockSessions.set(userId, newSession);
        return newSession;
      }
    }

    throw new Error('Invalid refresh token');
  },

  async logout(userId: string): Promise<{ message: string }> {
    await delay(MOCK_DELAY);
    mockSessions.delete(userId);
    return { message: 'Logged out successfully' };
  },

  // Utility: Get mock user (for testing)
  getMockUser(email: string): AuthUserSummary | null {
    for (const user of mockUsers.values()) {
      if (user.email === email) {
        const { password, ...summary } = user;
        return summary;
      }
    }
    return null;
  },
};
