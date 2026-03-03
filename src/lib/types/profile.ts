/**
 * Profile Types
 * Typed mock contracts for user profiles
 */

export type ProfileVisibility = 'PUBLIC' | 'UNIVERSITY_ONLY' | 'PRIVATE';

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  universityId: string;
  department: string;
  bio: string;
  profileImageFileId?: string;
  visibility: ProfileVisibility;
  reputationScore: number;
  completionScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  universityId?: string;
  department?: string;
  bio?: string;
  profileImageFileId?: string;
  visibility?: ProfileVisibility;
}
