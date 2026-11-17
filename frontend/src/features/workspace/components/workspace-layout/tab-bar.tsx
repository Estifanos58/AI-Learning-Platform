'use client';

import React from 'react';
import { TabData, useWorkspaceLayout } from './workspace-layout-context';
import { Tab, WORKSPACE_TAB_MIME } from './tab';
import { Columns, Maximize, Minimize, Rows, X } from 'lucide-react';

interface TabBarProps {
  paneId: string;
  tabs: TabData[];
  activeTabId?: string;
}

export function TabBar({ paneId, tabs, activeTabId }: TabBarProps) {
  const { setActiveTab, closeTab, splitPane, moveTab, closePane, isWorkspaceFullscreen, toggleWorkspaceFullscreen } = useWorkspaceLayout();

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(WORKSPACE_TAB_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData(WORKSPACE_TAB_MIME);
    if (data) {
      try {
        const { tab, paneId: sourcePaneId } = JSON.parse(data);
        if (sourcePaneId !== paneId || true) {
           moveTab(sourcePaneId, paneId, tab.id);
        }
      } catch (err) {}
    }
  };

  return (
    <div
      className="flex bg-muted/30 border-b border-border h-10 items-center shrink-0 overflow-x-auto overflow-y-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          paneId={paneId}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => setActiveTab(paneId, tab.id)}
          onClose={(e) => {
            e.stopPropagation();
            closeTab(paneId, tab.id);
          }}
        />
      ))}
      <div className="flex-1 min-w-4 h-full" />
      <div className="flex items-center gap-1 shrink-0 px-2">
        <button
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          onClick={() => toggleWorkspaceFullscreen()}
          title={isWorkspaceFullscreen ? "Restore Workspace (Alt+M)" : "Fullscreen Workspace (Alt+M)"}
        >
          {isWorkspaceFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
        <button
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          onClick={() => splitPane(paneId, 'vertical')}
          title="Split Down"
        >
          <Rows className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          onClick={() => splitPane(paneId, 'horizontal')}
          title="Split Right"
        >
          <Columns className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
          onClick={() => closePane(paneId)}
          title="Close Pane"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
