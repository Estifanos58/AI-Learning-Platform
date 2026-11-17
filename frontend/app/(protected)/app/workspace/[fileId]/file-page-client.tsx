'use client';

import { useEffect, useRef } from 'react';
import { FileItem } from '@/src/lib/types';
import { useWorkspaceLayout } from '@/src/features/workspace/components/workspace-layout/workspace-layout-context';
import { WorkspaceRoot } from '@/src/features/workspace/components/workspace-layout/workspace-root';

interface FilePageClientProps {
  file: FileItem;
}

export function FilePageClient({ file }: FilePageClientProps) {
  const { openTab, activePaneId } = useWorkspaceLayout();
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current && file) {
      initRef.current = true;
      openTab({ id: file.id, title: file.originalName }, activePaneId);
    }
  }, [file, openTab, activePaneId]);

  return <WorkspaceRoot />;
}
