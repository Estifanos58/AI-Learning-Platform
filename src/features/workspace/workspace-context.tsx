'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { WorkspaceContextType, WorkspaceFilePreview } from './workspace-context.types';
import { revokeObjectUrl } from './workspace-context.utils';

export type { WorkspaceFilePreview } from './workspace-context.types';

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [chatroomId, setChatroomId] = useState<string | null>(null);
  const [draftOtherUserId, setDraftOtherUserId] = useState<string | null>(null);
  const [preferredAiModelId, setPreferredAiModelId] = useState<string | null>(null);
  const [chatroomAiModelIds, setChatroomAiModelIds] = useState<Record<string, string | null>>({});
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, WorkspaceFilePreview>>({});
  const previewUrlsRef = useRef<Record<string, string | undefined>>({});

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const toggleChatPanel = useCallback(() => setChatPanelOpen((prev) => !prev), []);

  const getChatroomAiModelId = useCallback((roomId: string) => {
    return chatroomAiModelIds[roomId] ?? null;
  }, [chatroomAiModelIds]);

  const setChatroomAiModelId = useCallback((roomId: string, modelId: string | null) => {
    setChatroomAiModelIds((prev) => ({
      ...prev,
      [roomId]: modelId,
    }));
  }, []);

  const setFilePreview = useCallback((fileId: string, preview: WorkspaceFilePreview) => {
    setFilePreviews((prev) => {
      const previousUrl = prev[fileId]?.src;
      if (previousUrl && previousUrl !== preview.src) {
        revokeObjectUrl(previousUrl);
      }

      previewUrlsRef.current[fileId] = preview.src;
      return {
        ...prev,
        [fileId]: preview,
      };
    });
  }, []);

  const clearFilePreview = useCallback((fileId: string) => {
    setFilePreviews((prev) => {
      const existing = prev[fileId];
      if (!existing) return prev;

      revokeObjectUrl(existing.src);
      delete previewUrlsRef.current[fileId];

      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => revokeObjectUrl(url));
    };
  }, []);

  const value = useMemo<WorkspaceContextType>(() => ({
    selectedFolderId,
    selectedFileId,
    sidebarOpen,
    chatPanelOpen,
    chatroomId,
    draftOtherUserId,
    preferredAiModelId,
    setSelectedFolderId,
    setSelectedFileId,
    toggleSidebar,
    toggleChatPanel,
    setChatroomId,
    setDraftOtherUserId,
    setPreferredAiModelId,
    getChatroomAiModelId,
    setChatroomAiModelId,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    isProfileOpen,
    setProfileOpen,
    filePreviews,
    setFilePreview,
    clearFilePreview,
  }), [
    selectedFolderId,
    selectedFileId,
    sidebarOpen,
    chatPanelOpen,
    chatroomId,
    draftOtherUserId,
    preferredAiModelId,
    setSelectedFolderId,
    setSelectedFileId,
    toggleSidebar,
    toggleChatPanel,
    setChatroomId,
    setDraftOtherUserId,
    setPreferredAiModelId,
    getChatroomAiModelId,
    setChatroomAiModelId,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    isProfileOpen,
    setProfileOpen,
    filePreviews,
    setFilePreview,
    clearFilePreview,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
