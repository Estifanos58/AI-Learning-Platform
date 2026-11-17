'use client';

/**
 * DocumentViewer – Viewer component for DOCX / DOC / PPT / PPTX / XLS / XLSX files.
 *
 * Extensibility notes:
 *  - To render actual document content install mammoth (for DOCX) or
 *    use the Microsoft Office Online Viewer for publicly accessible files.
 *  - Replace the <OfficeOnlineEmbed> placeholder with a real renderer once
 *    the backend serves public storage URLs.
 */

import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { getFileCategoryMeta } from '../utils/file-type';
import {
  FileText,
  Table2,
  Presentation,
  FileSpreadsheet,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentViewerProps {
  file: FileItem;
  /**
   * Publicly accessible URL for the file – required for Office Online embed.
   * When absent the viewer shows a rich info card with a download prompt.
   */
  publicUrl?: string;
  /** Called when the user clicks the Download button */
  onDownload?: () => void;
}

/** Icon map per category */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4 text-blue-500" />,
  spreadsheet: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  presentation: <Presentation className="h-4 w-4 text-orange-500" />,
};

/** Large icon for the card */
const LARGE_ICON: Record<string, React.ReactNode> = {
  document: <FileText className="h-16 w-16 text-blue-400" />,
  spreadsheet: <Table2 className="h-16 w-16 text-green-400" />,
  presentation: <Presentation className="h-16 w-16 text-orange-400" />,
};

/** Background chip color per category */
const BG_COLOR: Record<string, string> = {
  document: 'bg-blue-500/10 border-blue-500/20',
  spreadsheet: 'bg-green-500/10 border-green-500/20',
  presentation: 'bg-orange-500/10 border-orange-500/20',
};

export function DocumentViewer({ file, publicUrl, onDownload }: DocumentViewerProps) {
  const meta = getFileCategoryMeta(file.contentType);
  const icon = CATEGORY_ICON[meta.category] ?? <FileText className="h-4 w-4 text-blue-500" />;
  const largeIcon = LARGE_ICON[meta.category] ?? <FileText className="h-16 w-16 text-blue-400" />;
  const bgColor = BG_COLOR[meta.category] ?? 'bg-blue-500/10 border-blue-500/20';

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar file={file} badge={meta.label} icon={icon} onDownload={onDownload} />

      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        {publicUrl ? (
          /* Microsoft Office Online embed – works for publicly accessible URLs */
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`}
            title={file.originalName}
            aria-label={`Office document viewer: ${file.originalName}`}
            className="w-full h-full min-h-[600px] rounded border border-border/20 shadow-lg"
          />
        ) : (
          /* Rich info card shown when no public URL is available */
          <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
            <div className={`mx-auto w-28 h-28 rounded-2xl border flex items-center justify-center ${bgColor}`}>
              {largeIcon}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{file.originalName}</h2>
              <p className="text-sm text-muted-foreground">
                {meta.label} · {(file.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Inline preview is not available for this file type yet.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="default" className="gap-2" onClick={onDownload} disabled={!onDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <ExternalLink className="h-4 w-4" />
                Open Externally
              </Button>
            </div>

            <p className="text-xs text-muted-foreground/50">
              Inline {meta.label} rendering coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
