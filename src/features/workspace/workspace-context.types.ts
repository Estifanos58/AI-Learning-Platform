import { WorkspaceState } from './types';
import type { WorkspaceFilePreview } from './workspace-file-preview';

export type { WorkspaceFilePreview } from './workspace-file-preview';

export interface WorkspaceContextType extends WorkspaceState {
  setSelectedFolderId: (id: string | null) => void;
  setSelectedFileId: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setChatroomId: (id: string | null) => void;
  setDraftOtherUserId: (id: string | null) => void;
  setPreferredAiModelId: (id: string | null) => void;
  getChatroomAiModelId: (roomId: string) => string | null;
  setChatroomAiModelId: (roomId: string, modelId: string | null) => void;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  isProfileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  filePreviews: Record<string, WorkspaceFilePreview>;
  setFilePreview: (fileId: string, preview: WorkspaceFilePreview) => void;
  clearFilePreview: (fileId: string) => void;
}
