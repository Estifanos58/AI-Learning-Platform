'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { WorkspaceState } from './types';

interface WorkspaceContextType extends WorkspaceState {
  setSelectedFolderId: (id: string | null) => void;
  setSelectedFileId: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setChatroomId: (id: string | null) => void;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  isProfileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [chatroomId, setChatroomId] = useState<string | null>(null);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [isProfileOpen, setProfileOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const toggleChatPanel = useCallback(() => setChatPanelOpen((prev) => !prev), []);

  const value: WorkspaceContextType = {
    selectedFolderId,
    selectedFileId,
    sidebarOpen,
    chatPanelOpen,
    chatroomId,
    setSelectedFolderId,
    setSelectedFileId,
    toggleSidebar,
    toggleChatPanel,
    setChatroomId,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    isProfileOpen,
    setProfileOpen,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
