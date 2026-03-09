import { z } from 'zod';

const MAX_UPLOAD_FILE_SIZE_BYTES = 200 * 1024 * 1024;

const emailSchema = z.string().trim().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long');
const usernameSchema = z.string().trim().min(1, 'Username is required').max(100, 'Username must be 100 characters or less');

export const signupSchema = z.object({ email: emailSchema, username: usernameSchema, password: passwordSchema, role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']) });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Password is required') });
export const verifyEmailSchema = z.object({ token: z.string().trim().min(1, 'Verification token is required') });
export const refreshSchema = z.object({ refreshToken: z.string().trim().min(1, 'Refresh token is required') });

export const updateProfileSchema = z.object({
  firstName: z.string().max(100, 'First name must be 100 characters or less').optional(),
  lastName: z.string().max(100, 'Last name must be 100 characters or less').optional(),
  universityId: z.string().max(50, 'University ID must be 50 characters or less').optional(),
  department: z.string().max(100, 'Department must be 100 characters or less').optional(),
  bio: z.string().max(2000, 'Bio must be 2000 characters or less').optional(),
  profileImageFileId: z.string().optional(),
}).strict();

export const createFolderSchema = z.object({ name: z.string().trim().min(1, 'Folder name is required'), parentId: z.string().optional() });
export const updateFolderSchema = z.object({ name: z.string().trim().min(1, 'Folder name is required') });
export const uploadFileSchema = z.object({
  fileType: z.enum(['PROFILE_IMAGE', 'DOCUMENT']),
  folderId: z.string().trim().min(1, 'Folder is required'),
  isShareable: z.boolean().optional(),
}).strict();

export const updateFileMetadataSchema = z.object({
  isShareable: z.boolean(),
}).strict();

export const sendMessageSchema = z.object({
  otherUserId: z.string().optional(), chatroomId: z.string().optional(), aiModelId: z.string().optional(),
  content: z.string().optional(), fileId: z.string().optional(), fileBase64: z.string().optional(),
  fileOriginalName: z.string().optional(), fileContentType: z.string().optional(),
}).superRefine((val, ctx) => {
  if (!val.content && !val.fileId && !val.fileBase64) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Message content or file is required' });
  }
});
