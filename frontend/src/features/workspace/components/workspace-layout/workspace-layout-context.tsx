'use client';

import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';

export type SplitDirection = 'horizontal' | 'vertical';

export interface TabData {
  id: string;
  title: string;
  type?: 'file' | 'chat';
}

export interface PaneNode {
  type: 'pane';
  id: string;
  tabs: TabData[];
  activeTabId?: string;
}

export interface SplitNode {
  type: 'split';
  id: string;
  direction: SplitDirection;
  children: LayoutNode[];
  sizes?: number[];
}

export type LayoutNode = PaneNode | SplitNode;

export interface WorkspaceLayoutState {
  layoutTree: LayoutNode;
  activePaneId: string;
  isWorkspaceFullscreen: boolean;
}

export type LayoutAction =
  | { type: 'HYDRATE_LAYOUT'; layoutTree: LayoutNode; activePaneId: string }
  | { type: 'OPEN_TAB'; paneId?: string; tab: TabData }
  | { type: 'CLOSE_TAB'; paneId: string; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; paneId: string; tabId: string }
  | { type: 'SET_ACTIVE_PANE'; paneId: string }
  | { type: 'SPLIT_PANE'; paneId: string; direction: SplitDirection }
  | { type: 'SET_SPLIT_SIZES'; splitId: string; sizes: number[] }
  | { type: 'CLOSE_PANE'; paneId: string }
  | { type: 'TOGGLE_WORKSPACE_FULLSCREEN' }
  | { type: 'SET_WORKSPACE_FULLSCREEN'; isFullscreen: boolean }
  | { type: 'MOVE_TAB'; fromPaneId: string; toPaneId: string; tabId: string; targetIndex?: number };

export const WORKSPACE_LAYOUT_STORAGE_KEY = 'ai_learning_platform.workspace.layout.v1';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyPane = (id = generateId()): PaneNode => ({
  type: 'pane',
  id,
  tabs: [],
});

const initialState: WorkspaceLayoutState = {
  layoutTree: createEmptyPane('root-pane'),
  activePaneId: 'root-pane',
  isWorkspaceFullscreen: false,
};

function isValidTab(value: unknown): value is TabData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    (candidate.type === undefined || candidate.type === 'file' || candidate.type === 'chat')
  );
}

export function isValidLayoutNode(value: unknown): value is LayoutNode {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'pane') {
    return (
      typeof candidate.id === 'string' &&
      candidate.id.length > 0 &&
      Array.isArray(candidate.tabs) &&
      candidate.tabs.every(isValidTab) &&
      (candidate.activeTabId === undefined || typeof candidate.activeTabId === 'string')
    );
  }
  if (candidate.type === 'split') {
    return (
      typeof candidate.id === 'string' &&
      candidate.id.length > 0 &&
      (candidate.direction === 'horizontal' || candidate.direction === 'vertical') &&
      Array.isArray(candidate.children) &&
      candidate.children.length >= 2 &&
      candidate.children.every(isValidLayoutNode) &&
      (candidate.sizes === undefined ||
        (Array.isArray(candidate.sizes) &&
          candidate.sizes.length === candidate.children.length &&
          candidate.sizes.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)))
    );
  }
  return false;
}

export function loadPersistedWorkspaceLayout(): { layoutTree: LayoutNode; activePaneId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || !isValidLayoutNode(parsed.layoutTree)) {
      return null;
    }
    const candidateActivePaneId =
      typeof parsed.activePaneId === 'string' && findPane(parsed.layoutTree, parsed.activePaneId)
        ? parsed.activePaneId
        : getFirstPaneId(parsed.layoutTree);
    return {
      layoutTree: parsed.layoutTree,
      activePaneId: candidateActivePaneId,
    };
  } catch {
    return null;
  }
}

export function savePersistedWorkspaceLayout(state: Pick<WorkspaceLayoutState, 'layoutTree' | 'activePaneId'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        layoutTree: state.layoutTree,
        activePaneId: state.activePaneId,
      }),
    );
  } catch {
    // Ignore quota or private-browsing storage errors
  }
}

// Helper to find a pane recursively
export const findPane = (node: LayoutNode, paneId: string): PaneNode | null => {
  if (node.type === 'pane') {
    return node.id === paneId ? node : null;
  }
  for (const child of node.children) {
    const found = findPane(child, paneId);
    if (found) return found;
  }
  return null;
};

// Helper: map over the tree to produce a new tree
const mapTree = (node: LayoutNode, updater: (n: LayoutNode) => LayoutNode | null): LayoutNode | null => {
  if (node.type === 'split') {
    const newChildren = node.children
      .map(child => mapTree(child, updater))
      .filter((child): child is LayoutNode => child !== null);

    // Auto-simplify splits if they have 1 or 0 children
    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return newChildren[0];

    const adjustedSizes =
      node.sizes && node.sizes.length === newChildren.length
        ? node.sizes
        : undefined;

    return updater({ ...node, children: newChildren, sizes: adjustedSizes });
  }

  return updater(node);
};

// Find first available pane (fallback)
const getFirstPaneId = (node: LayoutNode): string => {
  if (node.type === 'pane') return node.id;
  if (node.children.length > 0) return getFirstPaneId(node.children[0]);
  return 'root-pane';
};

export function layoutReducer(state: WorkspaceLayoutState, action: LayoutAction): WorkspaceLayoutState {
  switch (action.type) {
    case 'HYDRATE_LAYOUT': {
      return {
        ...state,
        layoutTree: action.layoutTree,
        activePaneId: action.activePaneId,
      };
    }

    case 'OPEN_TAB': {
      const targetPaneId = action.paneId || state.activePaneId;
      let didUpdate = false;
      const newTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'pane' && node.id === targetPaneId) {
          didUpdate = true;
          const exists = node.tabs.find(t => t.id === action.tab.id);
          const newTabs = exists ? node.tabs : [...node.tabs, action.tab];
          return {
            ...node,
            tabs: newTabs,
            activeTabId: action.tab.id,
          };
        }
        return node;
      });
      return {
        ...state,
        layoutTree: newTree || createEmptyPane('root-pane'),
        activePaneId: didUpdate ? targetPaneId : state.activePaneId,
      };
    }

    case 'CLOSE_TAB': {
      const newTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'pane' && node.id === action.paneId) {
          const newTabs = node.tabs.filter(t => t.id !== action.tabId);
          const newActiveTabId = node.activeTabId === action.tabId
            ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : undefined)
            : node.activeTabId;
          return { ...node, tabs: newTabs, activeTabId: newActiveTabId };
        }
        return node;
      });
      return { ...state, layoutTree: newTree || createEmptyPane('root-pane') };
    }

    case 'SET_ACTIVE_TAB': {
      const newTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'pane' && node.id === action.paneId) {
          return { ...node, activeTabId: action.tabId };
        }
        return node;
      });
      return { ...state, layoutTree: newTree || createEmptyPane('root-pane'), activePaneId: action.paneId };
    }

    case 'SET_ACTIVE_PANE': {
      return { ...state, activePaneId: action.paneId };
    }

    case 'TOGGLE_WORKSPACE_FULLSCREEN': {
      return { ...state, isWorkspaceFullscreen: !state.isWorkspaceFullscreen };
    }

    case 'SET_WORKSPACE_FULLSCREEN': {
      return { ...state, isWorkspaceFullscreen: action.isFullscreen };
    }

    case 'SPLIT_PANE': {
      let createdPaneId = '';
      const newTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'pane' && node.id === action.paneId) {
          createdPaneId = generateId();
          const newPane = createEmptyPane(createdPaneId);
          return {
            type: 'split',
            id: generateId(),
            direction: action.direction,
            children: [node, newPane],
            sizes: [50, 50],
          };
        }
        return node;
      });
      return {
        ...state,
        layoutTree: newTree || createEmptyPane('root-pane'),
        activePaneId: createdPaneId || state.activePaneId,
      };
    }

    case 'SET_SPLIT_SIZES': {
      const newTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'split' && node.id === action.splitId && action.sizes.length === node.children.length) {
          return { ...node, sizes: action.sizes };
        }
        return node;
      });
      return {
        ...state,
        layoutTree: newTree || createEmptyPane('root-pane'),
      };
    }

    case 'CLOSE_PANE': {
      const newTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'pane' && node.id === action.paneId) {
          return null;
        }
        return node;
      });

      const finalTree = newTree || createEmptyPane('root-pane');
      let nextActivePaneId = state.activePaneId;
      if (state.activePaneId === action.paneId || !findPane(finalTree, state.activePaneId)) {
        nextActivePaneId = getFirstPaneId(finalTree);
      }

      return { ...state, layoutTree: finalTree, activePaneId: nextActivePaneId };
    }

    case 'MOVE_TAB': {
      const sourcePane = findPane(state.layoutTree, action.fromPaneId);
      if (!sourcePane) return state;
      const tabToMove = sourcePane.tabs.find(t => t.id === action.tabId);
      if (!tabToMove) return state;

      let tempTree = mapTree(state.layoutTree, (node) => {
        if (node.type === 'pane' && node.id === action.fromPaneId) {
          const newTabs = node.tabs.filter(t => t.id !== action.tabId);
          return {
            ...node,
            tabs: newTabs,
            activeTabId: node.activeTabId === action.tabId
              ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : undefined)
              : node.activeTabId,
          };
        }
        return node;
      });

      tempTree = mapTree(tempTree || createEmptyPane('root-pane'), (node) => {
        if (node.type === 'pane' && node.id === action.toPaneId) {
          const newTabs = [...node.tabs];
          if (action.targetIndex !== undefined && action.targetIndex >= 0 && action.targetIndex <= newTabs.length) {
            newTabs.splice(action.targetIndex, 0, tabToMove);
          } else {
            newTabs.push(tabToMove);
          }
          return {
            ...node,
            tabs: newTabs,
            activeTabId: tabToMove.id,
          };
        }
        return node;
      });

      return {
        ...state,
        layoutTree: tempTree || createEmptyPane('root-pane'),
        activePaneId: action.toPaneId,
      };
    }

    default:
      return state;
  }
}

interface WorkspaceLayoutContextType extends WorkspaceLayoutState {
  dispatch: React.Dispatch<LayoutAction>;
  openTab: (tab: TabData, paneId?: string) => void;
  closeTab: (paneId: string, tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  setActivePane: (paneId: string) => void;
  splitPane: (paneId: string, direction: SplitDirection) => void;
  setSplitSizes: (splitId: string, sizes: number[]) => void;
  closePane: (paneId: string) => void;
  toggleWorkspaceFullscreen: () => void;
  moveTab: (fromPaneId: string, toPaneId: string, tabId: string, targetIndex?: number) => void;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextType | undefined>(undefined);

export function WorkspaceLayoutProvider({ children, initialTab }: { children: ReactNode; initialTab?: TabData }) {
  const [state, dispatch] = useReducer(layoutReducer, initialState);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    const persisted = loadPersistedWorkspaceLayout();
    if (persisted) {
      dispatch({
        type: 'HYDRATE_LAYOUT',
        layoutTree: persisted.layoutTree,
        activePaneId: persisted.activePaneId,
      });
    }
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    savePersistedWorkspaceLayout(state);
  }, [state.layoutTree, state.activePaneId]);

  useEffect(() => {
    if (initialTab) {
      dispatch({ type: 'OPEN_TAB', tab: initialTab });
    }
  }, [initialTab]);

  const openTab = useCallback((tab: TabData, paneId?: string) => dispatch({ type: 'OPEN_TAB', tab, paneId }), []);
  const closeTab = useCallback((paneId: string, tabId: string) => dispatch({ type: 'CLOSE_TAB', paneId, tabId }), []);
  const setActiveTab = useCallback((paneId: string, tabId: string) => dispatch({ type: 'SET_ACTIVE_TAB', paneId, tabId }), []);
  const setActivePane = useCallback((paneId: string) => dispatch({ type: 'SET_ACTIVE_PANE', paneId }), []);
  const splitPane = useCallback((paneId: string, direction: SplitDirection) => dispatch({ type: 'SPLIT_PANE', paneId, direction }), []);
  const setSplitSizes = useCallback((splitId: string, sizes: number[]) => dispatch({ type: 'SET_SPLIT_SIZES', splitId, sizes }), []);
  const closePane = useCallback((paneId: string) => dispatch({ type: 'CLOSE_PANE', paneId }), []);
  const toggleWorkspaceFullscreen = useCallback(() => {
    dispatch({ type: 'TOGGLE_WORKSPACE_FULLSCREEN' });
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);
  const moveTab = useCallback((fromPaneId: string, toPaneId: string, tabId: string, targetIndex?: number) =>
    dispatch({ type: 'MOVE_TAB', fromPaneId, toPaneId, tabId, targetIndex }), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleWorkspaceFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleWorkspaceFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        dispatch({ type: 'SET_WORKSPACE_FULLSCREEN', isFullscreen: false });
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <WorkspaceLayoutContext.Provider
      value={{
        ...state,
        dispatch,
        openTab,
        closeTab,
        setActiveTab,
        setActivePane,
        splitPane,
        setSplitSizes,
        closePane,
        toggleWorkspaceFullscreen,
        moveTab,
      }}
    >
      {children}
    </WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceLayout() {
  const context = useContext(WorkspaceLayoutContext);
  if (context === undefined) {
    throw new Error('useWorkspaceLayout must be used within WorkspaceLayoutProvider');
  }
  return context;
}
