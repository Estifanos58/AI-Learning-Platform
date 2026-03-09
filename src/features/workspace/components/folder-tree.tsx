'use client';

import { Folder, FileItem as FTFileItem } from '@/src/lib/types';
import { FolderTreeItem } from './folder-tree-item';

interface FolderTreeProps {
  folders: Folder[];
  files: FTFileItem[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folderId: string) => void;
  onCreateSubfolder?: (parentId: string) => void;
  onSelectFile?: (file: FTFileItem) => void;
  onDeleteFile?: (fileId: string) => void;
  onEditFile?: (file: FTFileItem) => void;
  isCompact?: boolean;
  /** Called when files are dropped onto a specific folder */
  onFolderDrop?: (folderId: string, files: File[]) => void;
}

export function FolderTree({
  folders,
  files,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  onCreateSubfolder,
  onSelectFile,
  onDeleteFile,
  onEditFile,
  isCompact,
  onFolderDrop,
}: FolderTreeProps) {
  // Filter root folders only
  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="space-y-0.5 py-1">
      {rootFolders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          allFolders={folders}
          files={files}
          selectedFolderId={selectedFolderId}
          level={0}
          onSelect={onSelectFolder}
          onEdit={onEditFolder}
          onDelete={onDeleteFolder}
          onCreateSub={onCreateSubfolder}
          onSelectFile={onSelectFile}
          onDeleteFile={onDeleteFile}
          onEditFile={onEditFile}
          isCompact={isCompact}
          onFolderDrop={onFolderDrop}
        />
      ))}
    </div>
  );
}

