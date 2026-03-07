import { FileItem, Folder } from '@/src/lib/types';
import { apiRequest } from './gateway-core';
import { createFolderSchema, updateFileMetadataSchema, updateFolderSchema, uploadFileSchema } from './gateway-schemas';

export const filesApi = {
  async listFolders(token: string, page = 0, size = 50): Promise<Folder[]> {
    const res = await apiRequest<{ folders: Folder[]; total: number }>(`/files/folders?page=${page}&size=${size}`, { token, cache: 'force-cache', next: { revalidate: 60, tags: ['folders'] } });
    return res.folders;
  },
  async listMyFiles(token: string, page = 0, size = 200): Promise<FileItem[]> {
    const res = await apiRequest<{ files: FileItem[]; total: number }>(`/files/my?page=${page}&size=${size}`, { token, cache: 'force-cache', next: { revalidate: 60, tags: ['files'] } });
    return res.files;
  },
  createFolder: (token: string, input: { name: string; parentId?: string }) => apiRequest<Folder>('/files/folders', { method: 'POST', token, body: createFolderSchema.parse(input), cache: 'no-store' }),
  updateFolder: (token: string, folderId: string, input: { name: string }) => apiRequest<Folder>(`/files/folders/${folderId}`, { method: 'PUT', token, body: updateFolderSchema.parse(input), cache: 'no-store' }),
  deleteFolder: (token: string, folderId: string) => apiRequest<{ message: string }>(`/files/folders/${folderId}`, { method: 'DELETE', token, cache: 'no-store' }),
  getFile: (token: string, fileId: string) => apiRequest<FileItem>(`/files/${fileId}`, { token, cache: 'force-cache', next: { revalidate: 60, tags: ['files', `file-${fileId}`] } }),
  deleteFile: (token: string, fileId: string) => apiRequest<{ message: string }>(`/files/${fileId}`, { method: 'DELETE', token, cache: 'no-store' }),
  uploadFile: (token: string, input: {
    fileType: 'PROFILE_IMAGE' | 'DOCUMENT';
    folderId: string;
    originalName: string;
    contentType?: string;
    contentBase64: string;
    isShareable?: boolean;
  }) => apiRequest<FileItem>('/files', { method: 'POST', token, body: uploadFileSchema.parse(input), cache: 'no-store' }),
  updateFileMetadata: (token: string, fileId: string, input: { isShareable: boolean }) => apiRequest<FileItem>(`/files/${fileId}/metadata`, { method: 'PATCH', token, body: updateFileMetadataSchema.parse(input), cache: 'no-store' }),
};
