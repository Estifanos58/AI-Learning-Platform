'use client';

import React from 'react';
import { PaneNode, useWorkspaceLayout } from './workspace-layout-context';
import { TabBar } from './tab-bar';
import { FileTabPreview } from './file-tab-preview';
import { EmptyStateWithUpload } from '../empty-state-with-upload';
import { DirectAiChat } from '../../chat/direct-ai-chat';

const WORKSPACE_CHAT_FILE_MIME = 'application/x-workspace-file';

export function Pane({ node }: { node: PaneNode }) {
  const { openTab, setActivePane, activePaneId } = useWorkspaceLayout();
  const isActive = activePaneId === node.id;

  const activeTab = node.tabs.find(t => t.id === node.activeTabId);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(WORKSPACE_CHAT_FILE_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(WORKSPACE_CHAT_FILE_MIME)) {
      e.preventDefault();
      const data = e.dataTransfer.getData(WORKSPACE_CHAT_FILE_MIME);
      if (data) {
        try {
          const fileInfo = JSON.parse(data);
          openTab({ id: fileInfo.id, title: fileInfo.originalName }, node.id);
        } catch (err) {}
      }
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-full bg-background border ${isActive ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'} transition-colors overflow-hidden relative group`}
      onClick={() => setActivePane(node.id)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <TabBar paneId={node.id} tabs={node.tabs} activeTabId={node.activeTabId} />
      
      <div className="flex-1 overflow-hidden relative">
        {node.activeTabId ? (
          activeTab?.type === 'chat' ? (
            <DirectAiChat key={node.activeTabId} tabId={node.activeTabId} />
          ) : (
            <FileTabPreview key={node.activeTabId} fileId={node.activeTabId} />
          )
        ) : (
          <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
            <EmptyStateWithUpload />
          </div>
        )}
      </div>
    </div>
  );
}
