'use client';

import { FileItem } from '@/src/lib/types';
import { Button } from '@/components/ui/button';
import { PdfToolbar } from './pdf-toolbar';
import { PdfPageViewport } from './pdf-page-viewport';

interface PdfViewerShellProps {
  file: FileItem;
}

export function PdfViewerShell({ file }: PdfViewerShellProps) {
  return (
    <div className="h-full flex flex-col bg-card">
      {/* Toolbar */}
      <PdfToolbar file={file} />

      {/* Viewport */}
      <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-black/20 flex items-start justify-center p-8">
        <PdfPageViewport file={file} />
      </div>
    </div>
  );
}
