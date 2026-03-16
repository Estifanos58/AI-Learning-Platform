'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { WorkspaceState } from './types';
import type { WorkspaceFilePreview } from './workspace-file-preview';

export type { WorkspaceFilePreview } from './workspace-file-preview';

function revokeObjectUrl(url?: string) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

interface WorkspaceContextType extends WorkspaceState {
  setSelectedFolderId: (id: string | null) => void;
  setSelectedFileId: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setChatroomId: (id: string | null) => void;
  setDraftOtherUserId: (id: string | null) => void;
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

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [chatroomId, setChatroomId] = useState<string | null>(null);
  const [draftOtherUserId, setDraftOtherUserId] = useState<string | null>(null);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, WorkspaceFilePreview>>({});
  const previewUrlsRef = useRef<Record<string, string | undefined>>({});

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const toggleChatPanel = useCallback(() => setChatPanelOpen((prev) => !prev), []);

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
    setSelectedFolderId,
    setSelectedFileId,
    toggleSidebar,
    toggleChatPanel,
    setChatroomId,
    setDraftOtherUserId,
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
    setSelectedFolderId,
    setSelectedFileId,
    toggleSidebar,
    toggleChatPanel,
    setChatroomId,
    setDraftOtherUserId,
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
