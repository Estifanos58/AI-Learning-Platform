'use client';

import React from 'react';
import { X } from 'lucide-react';
import { TabData } from './workspace-layout-context';

interface TabProps {
  paneId: string;
  tab: TabData;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

export const WORKSPACE_TAB_MIME = 'application/x-workspace-tab';

export function Tab({ paneId, tab, isActive, onClick, onClose }: TabProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(WORKSPACE_TAB_MIME, JSON.stringify({ tab, paneId }));
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`group flex items-center h-full px-4 gap-2 border-r border-border cursor-pointer select-none min-w-[120px] max-w-[240px] transition-colors relative ${
        isActive
          ? 'bg-background text-foreground'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
      }`}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
      )}
      <span className="truncate flex-1 text-sm font-medium">{tab.title}</span>
      <button
        onClick={onClose}
        className={`p-0.5 rounded-sm hover:bg-muted-foreground/20 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
