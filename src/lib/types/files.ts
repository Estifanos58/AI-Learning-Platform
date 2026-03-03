/**
 * File Management Types
 * Typed mock contracts for folder and file operations
 */

export type FileType = 'PROFILE_IMAGE' | 'DOCUMENT';

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentId?: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  ownerId: string;
  folderId: string;
  fileType: FileType;
  originalName: string;
  storedName: string;
  contentType: string;
  fileSize: number;
  storagePath: string;
  isShareable: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  parentId?: string;
}

export interface UpdateFileMetadataRequest {
  isShareable?: boolean;
  originalName?: string;
}

export interface UploadFileRequest {
  fileType: FileType;
  folderId: string;
  originalName: string;
  contentType: string;
  fileSize: number;
}

export interface ShareFileRequest {
  fileId: string;
  sharedWithUserId: string;
}

export interface ShareFolderRequest {
  folderId: string;
  sharedWithUserId: string;
}
