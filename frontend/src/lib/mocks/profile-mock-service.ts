/**
 * Mock Profile Service
 * Simulates user profile operations
 */

import { UpdateProfileRequest, UserProfile } from '@/src/lib/types';

const MOCK_DELAY = 300;

// In-memory store
const profiles = new Map<string, UserProfile>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initializeMockData() {
  if (profiles.size > 0) return;

  const demoProfile: UserProfile = {
    userId: 'user-1',
    firstName: 'Alex',
    lastName: 'Chen',
    universityId: 'BERKELEY-2023',
    department: 'Computer Science',
    bio: 'Machine learning researcher passionate about AI education and accessibility.',
    visibility: 'UNIVERSITY_ONLY',
    reputationScore: 45,
    completionScore: 78,
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-02-15').toISOString(),
  };

  profiles.set(demoProfile.userId, demoProfile);
}

export const profileMockService = {
  async getMyProfile(userId: string): Promise<UserProfile> {
    await delay(MOCK_DELAY);
    initializeMockData();

    let profile = profiles.get(userId);
    if (!profile) {
      // Create default profile for new user
      profile = {
        userId,
        firstName: 'User',
        lastName: 'Profile',
        universityId: '',
        department: '',
        bio: '',
        visibility: 'PRIVATE',
        reputationScore: 0,
        completionScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      profiles.set(userId, profile);
    }

    return profile;
  },

  async getProfileById(userId: string, profileUserId: string): Promise<UserProfile> {
    await delay(MOCK_DELAY);
    initializeMockData();

    const profile = profiles.get(profileUserId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Check visibility
    if (profile.visibility === 'PRIVATE' && profileUserId !== userId) {
      throw new Error('This profile is private');
    }

    return profile;
  },

  async updateMyProfile(userId: string, request: UpdateProfileRequest): Promise<UserProfile> {
    await delay(MOCK_DELAY);
    initializeMockData();

    let profile = profiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        firstName: 'User',
        lastName: 'Profile',
        universityId: '',
        department: '',
        bio: '',
        visibility: 'PRIVATE',
        reputationScore: 0,
        completionScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (request.firstName !== undefined) {
      profile.firstName = request.firstName.trim();
    }
    if (request.lastName !== undefined) {
      profile.lastName = request.lastName.trim();
    }
    if (request.universityId !== undefined) {
      profile.universityId = request.universityId.trim();
    }
    if (request.department !== undefined) {
      profile.department = request.department.trim();
    }
    if (request.bio !== undefined) {
      profile.bio = request.bio.trim();
    }
    if (request.visibility !== undefined) {
      profile.visibility = request.visibility;
    }
    if (request.profileImageFileId !== undefined) {
      profile.profileImageFileId = request.profileImageFileId;
    }

    profile.updatedAt = new Date().toISOString();
    profiles.set(userId, profile);

    return profile;
  },

  async searchProfiles(query: string, limit: number = 10): Promise<UserProfile[]> {
    await delay(MOCK_DELAY);
    initializeMockData();

    const lowerQuery = query.toLowerCase();
    return Array.from(profiles.values())
      .filter(
        (p) =>
          p.visibility !== 'PRIVATE' &&
          (p.firstName.toLowerCase().includes(lowerQuery) || p.lastName.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  },

  async updateVisibility(userId: string, visibility: 'PUBLIC' | 'UNIVERSITY_ONLY' | 'PRIVATE'): Promise<UserProfile> {
    await delay(MOCK_DELAY);
    initializeMockData();

    const profile = await this.getMyProfile(userId);
    profile.visibility = visibility;
    profile.updatedAt = new Date().toISOString();
    profiles.set(userId, profile);

    return profile;
  },
};
