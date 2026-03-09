'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/src/features/workspace/components/app-shell';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
