/**
 * Mock File Management Service
 * Simulates folder and file operations with in-memory store
 */

import {
  CreateFolderRequest,
  FileItem,
  Folder,
  ShareFileRequest,
  ShareFolderRequest,
  UpdateFileMetadataRequest,
  UpdateFolderRequest,
  UploadFileRequest,
} from '@/src/lib/types';

const MOCK_DELAY = 300;

// In-memory store
const folders = new Map<string, Folder>();
const files = new Map<string, FileItem>();

// Initialize mock data for demo user
const DEMO_USER_ID = 'user-1';

function initializeMockData() {
  if (folders.size > 0) return;

  // Create default folders
  const rootFolder: Folder = {
    id: 'folder-1',
    ownerId: DEMO_USER_ID,
    name: 'My Documents',
    deleted: false,
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
  };

  const subfolder: Folder = {
    id: 'folder-2',
    ownerId: DEMO_USER_ID,
    name: 'Research Papers',
    parentId: 'folder-1',
    deleted: false,
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString(),
  };

  const mlFolder: Folder = {
    id: 'folder-3',
    ownerId: DEMO_USER_ID,
    name: 'Machine Learning',
    parentId: 'folder-2',
    deleted: false,
    createdAt: new Date('2024-01-22').toISOString(),
    updatedAt: new Date('2024-01-22').toISOString(),
  };

  const deepLearningFolder: Folder = {
    id: 'folder-4',
    ownerId: DEMO_USER_ID,
    name: 'Deep Learning',
    parentId: 'folder-3',
    deleted: false,
    createdAt: new Date('2024-01-25').toISOString(),
    updatedAt: new Date('2024-01-25').toISOString(),
  };

  const coursesFolder: Folder = {
    id: 'folder-5',
    ownerId: DEMO_USER_ID,
    name: 'Courses',
    parentId: 'folder-1',
    deleted: false,
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date('2024-02-01').toISOString(),
  };

  const pythonFolder: Folder = {
    id: 'folder-6',
    ownerId: DEMO_USER_ID,
    name: 'Python Advanced',
    parentId: 'folder-5',
    deleted: false,
    createdAt: new Date('2024-02-05').toISOString(),
    updatedAt: new Date('2024-02-05').toISOString(),
  };

  const projectFolder: Folder = {
    id: 'folder-7',
    ownerId: DEMO_USER_ID,
    name: 'Project Alpha',
    parentId: undefined, // Root folder
    deleted: false,
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  };

  const designFolder: Folder = {
    id: 'folder-8',
    ownerId: DEMO_USER_ID,
    name: 'Design Assets',
    parentId: 'folder-7',
    deleted: false,
    createdAt: new Date('2024-03-02').toISOString(),
    updatedAt: new Date('2024-03-02').toISOString(),
  };

  const specsFolder: Folder = {
    id: 'folder-9',
    ownerId: DEMO_USER_ID,
    name: 'Specifications',
    parentId: 'folder-7',
    deleted: false,
    createdAt: new Date('2024-03-03').toISOString(),
    updatedAt: new Date('2024-03-03').toISOString(),
  };

  const archiveFolder: Folder = {
    id: 'folder-10',
    ownerId: DEMO_USER_ID,
    name: 'Archive',
    parentId: undefined,
    deleted: false,
    createdAt: new Date('2023-12-01').toISOString(),
    updatedAt: new Date('2023-12-01').toISOString(),
  };


  folders.set(rootFolder.id, rootFolder);
  folders.set(subfolder.id, subfolder);
  folders.set(mlFolder.id, mlFolder);
  folders.set(deepLearningFolder.id, deepLearningFolder);
  folders.set(coursesFolder.id, coursesFolder);
  folders.set(pythonFolder.id, pythonFolder);
  folders.set(projectFolder.id, projectFolder);
  folders.set(designFolder.id, designFolder);
  folders.set(specsFolder.id, specsFolder);
  folders.set(archiveFolder.id, archiveFolder);

  // Create demo files
  const demoFile: FileItem = {
    id: 'file-1',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-2',
    fileType: 'DOCUMENT',
    originalName: 'Machine Learning Basics.pdf',
    storedName: 'file-1.pdf',
    contentType: 'application/pdf',
    fileSize: 2048000,
    storagePath: '/files/file-1.pdf',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date('2024-02-01').toISOString(),
  };

  const demoFile2: FileItem = {
    id: 'file-2',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-2',
    fileType: 'DOCUMENT',
    originalName: 'Neural Networks Guide.pdf',
    storedName: 'file-2.pdf',
    contentType: 'application/pdf',
    fileSize: 3145728,
    storagePath: '/files/file-2.pdf',
    isShareable: false,
    deleted: false,
    createdAt: new Date('2024-02-10').toISOString(),
    updatedAt: new Date('2024-02-10').toISOString(),
  };

  const demoFile3: FileItem = {
    id: 'file-3',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-3',
    fileType: 'DOCUMENT',
    originalName: 'Supervised Learning Methods.pdf',
    storedName: 'file-3.pdf',
    contentType: 'application/pdf',
    fileSize: 2756608,
    storagePath: '/files/file-3.pdf',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-02-12').toISOString(),
    updatedAt: new Date('2024-02-12').toISOString(),
  };

  const demoFile4: FileItem = {
    id: 'file-4',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-4',
    fileType: 'DOCUMENT',
    originalName: 'CNN Architecture and Applications.pdf',
    storedName: 'file-4.pdf',
    contentType: 'application/pdf',
    fileSize: 4194304,
    storagePath: '/files/file-4.pdf',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date('2024-02-15').toISOString(),
  };

  const demoFile5: FileItem = {
    id: 'file-5',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-4',
    fileType: 'DOCUMENT',
    originalName: 'RNN and LSTM Networks.pdf',
    storedName: 'file-5.pdf',
    contentType: 'application/pdf',
    fileSize: 3670016,
    storagePath: '/files/file-5.pdf',
    isShareable: false,
    deleted: false,
    createdAt: new Date('2024-02-18').toISOString(),
    updatedAt: new Date('2024-02-18').toISOString(),
  };

  const demoFile6: FileItem = {
    id: 'file-6',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-5',
    fileType: 'DOCUMENT',
    originalName: 'Introduction to Courses.pdf',
    storedName: 'file-6.pdf',
    contentType: 'application/pdf',
    fileSize: 1572864,
    storagePath: '/files/file-6.pdf',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-02-20').toISOString(),
    updatedAt: new Date('2024-02-20').toISOString(),
  };

  const demoFile7: FileItem = {
    id: 'file-7',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-6',
    fileType: 'DOCUMENT',
    originalName: 'Advanced Python Patterns.pdf',
    storedName: 'file-7.pdf',
    contentType: 'application/pdf',
    fileSize: 2359296,
    storagePath: '/files/file-7.pdf',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-02-22').toISOString(),
    updatedAt: new Date('2024-02-22').toISOString(),
  };

  const demoFile8: FileItem = {
    id: 'file-8',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-6',
    fileType: 'DOCUMENT',
    originalName: 'Async Programming in Python.pdf',
    storedName: 'file-8.pdf',
    contentType: 'application/pdf',
    fileSize: 1945600,
    storagePath: '/files/file-8.pdf',
    isShareable: false,
    deleted: false,
    createdAt: new Date('2024-02-25').toISOString(),
    updatedAt: new Date('2024-02-25').toISOString(),
  };

  const newFile1: FileItem = {
    id: 'file-9',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-7',
    fileType: 'DOCUMENT',
    originalName: 'Project_Alpha_Overview.pdf',
    storedName: 'uuid-1234-file-9.pdf',
    contentType: 'application/pdf',
    fileSize: 1024 * 500,
    storagePath: '/uploads/user-1/uuid-1234-file-9.pdf',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  };

  const newFile2: FileItem = {
    id: 'file-10',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-8',
    fileType: 'DOCUMENT',
    originalName: 'Mockups_v1.fig',
    storedName: 'uuid-1234-file-10.fig',
    contentType: 'application/octet-stream',
    fileSize: 1024 * 2000,
    storagePath: '/uploads/user-1/uuid-1234-file-10.fig',
    isShareable: false,
    deleted: false,
    createdAt: new Date('2024-03-02').toISOString(),
    updatedAt: new Date('2024-03-02').toISOString(),
  };

  const newFile3: FileItem = {
    id: 'file-11',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-9',
    fileType: 'DOCUMENT',
    originalName: 'API_Specs.json',
    storedName: 'uuid-1234-file-11.json',
    contentType: 'application/json',
    fileSize: 1024 * 10,
    storagePath: '/uploads/user-1/uuid-1234-file-11.json',
    isShareable: true,
    deleted: false,
    createdAt: new Date('2024-03-03').toISOString(),
    updatedAt: new Date('2024-03-03').toISOString(),
  };

  const newFile4: FileItem = {
    id: 'file-12',
    ownerId: DEMO_USER_ID,
    folderId: 'folder-10',
    fileType: 'DOCUMENT',
    originalName: 'Old_Report_2023.pdf',
    storedName: 'uuid-1234-file-12.pdf',
    contentType: 'application/pdf',
    fileSize: 1024 * 800,
    storagePath: '/uploads/user-1/uuid-1234-file-12.pdf',
    isShareable: false,
    deleted: false,
    createdAt: new Date('2023-12-05').toISOString(),
    updatedAt: new Date('2023-12-05').toISOString(),
  };

  files.set(demoFile.id, demoFile);
  files.set(newFile1.id, newFile1);
  files.set(newFile2.id, newFile2);
  files.set(newFile3.id, newFile3);
  files.set(newFile4.id, newFile4);

  files.set(demoFile2.id, demoFile2);
  files.set(demoFile3.id, demoFile3);
  files.set(demoFile4.id, demoFile4);
  files.set(demoFile5.id, demoFile5);
  files.set(demoFile6.id, demoFile6);
  files.set(demoFile7.id, demoFile7);
  files.set(demoFile8.id, demoFile8);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const fileMockService = {
  // Folder operations
  async createFolder(userId: string, request: CreateFolderRequest): Promise<Folder> {
    await delay(MOCK_DELAY);
    initializeMockData();

    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Folder name is required');
    }

    const folder: Folder = {
      id: generateId('folder'),
      ownerId: userId,
      name: request.name.trim(),
      parentId: request.parentId,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    folders.set(folder.id, folder);
    return folder;
  },

  async updateFolder(userId: string, folderId: string, request: UpdateFolderRequest): Promise<Folder> {
    await delay(MOCK_DELAY);

    const folder = folders.get(folderId);
    if (!folder || folder.ownerId !== userId) {
      throw new Error('Folder not found or access denied');
    }

    if (request.name !== undefined) {
      folder.name = request.name.trim();
    }
    if (request.parentId !== undefined) {
      folder.parentId = request.parentId;
    }

    folder.updatedAt = new Date().toISOString();
    return folder;
  },

  async deleteFolder(userId: string, folderId: string): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const folder = folders.get(folderId);
    if (!folder || folder.ownerId !== userId) {
      throw new Error('Folder not found or access denied');
    }

    folder.deleted = true;
    folder.updatedAt = new Date().toISOString();

    // Soft delete associated files
    for (const file of files.values()) {
      if (file.folderId === folderId && file.ownerId === userId) {
        file.deleted = true;
      }
    }

    return { message: 'Folder deleted' };
  },

  async listMyFolders(userId: string): Promise<Folder[]> {
    await delay(MOCK_DELAY);
    initializeMockData();

    return Array.from(folders.values())
      .filter((f) => f.ownerId === userId && !f.deleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async listSharedFolders(userId: string): Promise<Folder[]> {
    await delay(MOCK_DELAY);

    // Mock: return empty for now (sharing not fully implemented)
    return [];
  },

  // File operations
  async uploadFile(userId: string, request: UploadFileRequest): Promise<FileItem> {
    await delay(MOCK_DELAY);

    const folder = folders.get(request.folderId);
    if (!folder || folder.ownerId !== userId) {
      throw new Error('Folder not found or access denied');
    }

    const file: FileItem = {
      id: generateId('file'),
      ownerId: userId,
      folderId: request.folderId,
      fileType: request.fileType,
      originalName: request.originalName,
      storedName: `${generateId('stored')}.${request.originalName.split('.').pop()}`,
      contentType: request.contentType,
      fileSize: request.fileSize,
      storagePath: `/files/${generateId('file')}.pdf`,
      isShareable: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    files.set(file.id, file);
    return file;
  },

  async getFileMetadata(userId: string, fileId: string): Promise<FileItem> {
    await delay(MOCK_DELAY);

    const file = files.get(fileId);
    if (!file || file.ownerId !== userId) {
      throw new Error('File not found or access denied');
    }

    return file;
  },

  async updateFileMetadata(userId: string, fileId: string, request: UpdateFileMetadataRequest): Promise<FileItem> {
    await delay(MOCK_DELAY);

    const file = files.get(fileId);
    if (!file || file.ownerId !== userId) {
      throw new Error('File not found or access denied');
    }

    if (request.isShareable !== undefined) {
      file.isShareable = request.isShareable;
    }
    if (request.originalName !== undefined) {
      file.originalName = request.originalName;
    }

    file.updatedAt = new Date().toISOString();
    return file;
  },

  async deleteFile(userId: string, fileId: string): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const file = files.get(fileId);
    if (!file || file.ownerId !== userId) {
      throw new Error('File not found or access denied');
    }

    file.deleted = true;
    file.updatedAt = new Date().toISOString();

    return { message: 'File deleted' };
  },

  async listMyFiles(userId: string, folderId?: string): Promise<FileItem[]> {
    await delay(MOCK_DELAY);
    initializeMockData();

    let result = Array.from(files.values()).filter((f) => f.ownerId === userId && !f.deleted);

    if (folderId) {
      result = result.filter((f) => f.folderId === folderId);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async listSharedWithMe(userId: string): Promise<FileItem[]> {
    await delay(MOCK_DELAY);

    // Mock: return empty for now
    return [];
  },

  // Share operations (mock)
  async shareFile(userId: string, request: ShareFileRequest): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const file = files.get(request.fileId);
    if (!file || file.ownerId !== userId) {
      throw new Error('File not found or access denied');
    }

    // Mock: would create permission record
    return { message: `File shared with user ${request.sharedWithUserId}` };
  },

  async unshareFile(userId: string, fileId: string, sharedWithUserId: string): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const file = files.get(fileId);
    if (!file || file.ownerId !== userId) {
      throw new Error('File not found or access denied');
    }

    // Mock: would revoke permission
    return { message: `Sharing revoked from ${sharedWithUserId}` };
  },

  async shareFolder(userId: string, request: ShareFolderRequest): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const folder = folders.get(request.folderId);
    if (!folder || folder.ownerId !== userId) {
      throw new Error('Folder not found or access denied');
    }

    return { message: `Folder shared with user ${request.sharedWithUserId}` };
  },

  async unshareFolder(userId: string, folderId: string, sharedWithUserId: string): Promise<{ message: string }> {
    await delay(MOCK_DELAY);

    const folder = folders.get(folderId);
    if (!folder || folder.ownerId !== userId) {
      throw new Error('Folder not found or access denied');
    }

    return { message: `Sharing revoked from ${sharedWithUserId}` };
  },
};
