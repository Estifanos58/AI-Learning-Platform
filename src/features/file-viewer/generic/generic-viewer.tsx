'use client';

/**
 * GenericViewer – Fallback viewer for file types that don't have a
 * dedicated viewer yet (archives, executables, unknown types, etc.).
 *
 * Extensibility notes:
 *  - Add a text/hex dump panel for inspectable files.
 *  - Connect the Download button to a real download handler once
 *    storage URLs are available.
 */

import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { getFileCategoryMeta } from '../utils/file-type';
import { File, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GenericViewerProps {
  file: FileItem;
  /** Called when the user clicks the Download button */
  onDownload?: () => void;
}

export function GenericViewer({ file, onDownload }: GenericViewerProps) {
  const meta = getFileCategoryMeta(file.contentType);

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge={meta.label}
        icon={<File className="h-4 w-4 text-muted-foreground" />}
        onDownload={onDownload}
      />

      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-6 animate-in fade-in duration-500">
          {/* Icon */}
          <div className="mx-auto w-28 h-28 rounded-2xl border bg-muted/40 border-border flex items-center justify-center">
            <File className="h-14 w-14 text-muted-foreground/60" />
          </div>

          {/* File info */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold break-all">{file.originalName}</h2>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-mono text-xs">
                {file.contentType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground/70 pt-2">
              No preview is available for this file type.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="default" className="gap-2" onClick={onDownload} disabled={!onDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <ExternalLink className="h-4 w-4" />
              Open Externally
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
