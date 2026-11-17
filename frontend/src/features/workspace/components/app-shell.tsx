'use client';

import { ReactNode } from 'react';
import { TopBar } from './top-bar';
import { LeftSidebar } from './left-sidebar';
import { RightChatPanel } from '../chat/right-chat-panel';
import { ResizableSidebar } from './resizable-sidebar';
import { useWorkspace } from '../workspace-context';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const {
    sidebarOpen,
    chatPanelOpen,
    toggleSidebar,
    toggleChatPanel,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
  } = useWorkspace();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Resizable Sidebar */}
        <ResizableSidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          width={leftSidebarWidth}
          onWidthChange={setLeftSidebarWidth}
          position="left"
          minWidth={52}
          maxWidth={500}
        >
          <LeftSidebar isOpen={sidebarOpen} />
        </ResizableSidebar>

        {/* Center Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-card">
          {children}
        </main>

        {/* Right Resizable Chat Panel */}
        <ResizableSidebar
          isOpen={chatPanelOpen}
          onToggle={toggleChatPanel}
          width={rightSidebarWidth}
          onWidthChange={setRightSidebarWidth}
          position="right"
          minWidth={220}
          maxWidth={500}
        >
          <RightChatPanel isOpen={chatPanelOpen} />
        </ResizableSidebar>
      </div>
    </div>
  );
}
