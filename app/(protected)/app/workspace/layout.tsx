'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/src/features/workspace/components/app-shell';
import { WorkspaceLayoutProvider } from '@/src/features/workspace/components/workspace-layout/workspace-layout-context';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceLayoutProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceLayoutProvider>
  );
}
