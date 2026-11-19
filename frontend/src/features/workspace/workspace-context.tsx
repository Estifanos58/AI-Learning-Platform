'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { WorkspaceContextType, WorkspaceFilePreview } from './workspace-context.types';
import { revokeObjectUrl } from './workspace-context.utils';

export type { WorkspaceFilePreview } from './workspace-context.types';

export const WORKSPACE_PREFS_STORAGE_KEY = 'ai_learning_platform.workspace.prefs.v1';

interface PersistedWorkspacePrefs {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  preferredAiModelId: string | null;
}

function clampWidth(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function loadWorkspacePrefs(): Partial<PersistedWorkspacePrefs> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WORKSPACE_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...(typeof parsed.sidebarOpen === 'boolean' ? { sidebarOpen: parsed.sidebarOpen } : {}),
      ...(typeof parsed.chatPanelOpen === 'boolean' ? { chatPanelOpen: parsed.chatPanelOpen } : {}),
      leftSidebarWidth: clampWidth(parsed.leftSidebarWidth, 52, 500, 280),
      rightSidebarWidth: clampWidth(parsed.rightSidebarWidth, 220, 500, 320),
      ...(parsed.preferredAiModelId === null || typeof parsed.preferredAiModelId === 'string'
        ? { preferredAiModelId: parsed.preferredAiModelId }
        : {}),
    };
  } catch {
    return {};
  }
}

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
  const hasHydratedPrefsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const saved = loadWorkspacePrefs();
      if (saved.sidebarOpen !== undefined) setSidebarOpen(saved.sidebarOpen);
      if (saved.chatPanelOpen !== undefined) setChatPanelOpen(saved.chatPanelOpen);
      if (saved.leftSidebarWidth !== undefined) setLeftSidebarWidth(saved.leftSidebarWidth);
      if (saved.rightSidebarWidth !== undefined) setRightSidebarWidth(saved.rightSidebarWidth);
      if (saved.preferredAiModelId !== undefined) setPreferredAiModelId(saved.preferredAiModelId);
      hasHydratedPrefsRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedPrefsRef.current || typeof window === 'undefined') return;
    try {
      const payload: PersistedWorkspacePrefs = {
        sidebarOpen,
        chatPanelOpen,
        leftSidebarWidth,
        rightSidebarWidth,
        preferredAiModelId,
      };
      window.localStorage.setItem(WORKSPACE_PREFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [sidebarOpen, chatPanelOpen, leftSidebarWidth, rightSidebarWidth, preferredAiModelId]);

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
