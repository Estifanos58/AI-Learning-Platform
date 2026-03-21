/**
 * Workspace types and constants
 */

export interface WorkspaceState {
  selectedFolderId: string | null;
  selectedFileId: string | null;
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  chatroomId: string | null;
  draftOtherUserId: string | null;
  preferredAiModelId: string | null;
}
